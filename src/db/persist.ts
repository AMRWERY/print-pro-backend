import type { InStatement } from "@libsql/client";
import { all, batch, get } from "./index";

/**
 * The domain modules keep their working state in plain arrays and objects (their query and
 * validation logic is unchanged). This layer makes that state durable and shared between API instances:
 *
 *  - `preload()` reads everything from the database once, before the modules load.
 *  - `persistentList` / `persistentValue` hand each module its state (loaded, or seeded on first run).
 *  - `syncAll()` writes back only what changed, in one versioned batch.
 *  - `refresh()` runs at the start of a request: if another instance has written since, it pulls just
 *    those records into the same arrays, so every instance sees the same data.
 *
 * Every write bumps one database-wide version number; each changed row records it. That is what lets
 * `refresh()` ask for "everything newer than what I have". Two instances changing the same record at
 * the same moment resolve as last-write-wins.
 */

interface ListEntry {
  name: string;
  items: { id: string }[];
  /** id -> position + serialized doc as last written or loaded. */
  written: Map<string, { pos: number; json: string }>;
}
interface ValueEntry {
  key: string;
  box: { value: unknown };
  written: string;
}
interface DocRow {
  collection: string;
  id: string;
  pos: number;
  json: string;
  deleted?: number;
}

const lists = new Map<string, ListEntry>();
const values = new Map<string, ValueEntry>();
/** Collections seeded in this process whose "already seeded" marker still has to be written. */
const unmarked = new Set<string>();

/** The database version this process has seen. */
let lastSeen = 0;
/** Set when a write failed half-way, so the next request reloads from the database. */
let dirty = false;

let preDocs = new Map<string, DocRow[]>();
let preKv = new Map<string, string>();

const seededKey = (name: string) => `seeded:${name}`;
const BUMP = "UPDATE meta SET n = n + 1 WHERE key = 'ver'";
const VER = "(SELECT n FROM meta WHERE key = 'ver')";

/** Reads the whole database into memory. Call once, before importing the domain modules. */
export const preload = async () => {
  lastSeen = (await get<{ n: number }>("SELECT n FROM meta WHERE key = 'ver'"))?.n ?? 0;
  preDocs = new Map();
  for (const r of await all<DocRow>("SELECT collection, id, pos, json FROM docs WHERE deleted = 0 ORDER BY collection, pos")) {
    const list = preDocs.get(r.collection) ?? [];
    list.push(r);
    preDocs.set(r.collection, list);
  }
  preKv = new Map((await all<{ key: string; json: string }>("SELECT key, json FROM kv")).map((r) => [r.key, r.json]));
};

/** A durable array of documents. `seed` runs only when the collection has never been saved. */
export const persistentList = <T extends { id: string }>(name: string, seed: () => T[]): T[] => {
  const rows = preDocs.get(name);
  const written = new Map<string, { pos: number; json: string }>();
  let items: T[];
  if (rows?.length) {
    items = rows.map((r) => {
      written.set(r.id, { pos: r.pos, json: r.json });
      return JSON.parse(r.json) as T;
    });
  } else if (preKv.has(seededKey(name))) {
    // Seeded before and since emptied by an admin: stay empty rather than bringing demo data back.
    items = [];
  } else {
    items = seed();
    unmarked.add(name);
  }
  preDocs.delete(name);
  lists.set(name, { name, items, written });
  return items;
};

/** A durable single value (settings, a counter). Read and write `box.value`. */
export const persistentValue = <T>(key: string, init: () => T): { value: T } => {
  const json = preKv.get(key);
  const box = { value: json !== undefined ? (JSON.parse(json) as T) : init() };
  values.set(key, { key, box, written: json ?? "" });
  return box;
};

/**
 * Stored positions only need to sort correctly. When the existing rows kept their relative order
 * and new rows were added at the start or end (the common create case), new rows get positions
 * beyond the old range and nothing else is rewritten. Any other reorder renumbers the list.
 */
const positionsFor = (list: ListEntry): number[] => {
  const { items, written } = list;
  const renumber = () => items.map((_, i) => i);

  const known = items.map((it) => written.get(it.id)?.pos);
  const first = known.findIndex((p) => p !== undefined);
  if (first === -1) return renumber();
  let last = known.length - 1;
  while (known[last] === undefined) last--;

  // New rows are allowed only before the first and after the last existing row.
  let prev = -Infinity;
  for (let i = first; i <= last; i++) {
    const p = known[i];
    if (p === undefined || p <= prev) return renumber();
    prev = p;
  }

  const out = new Array<number>(items.length);
  for (let i = first; i <= last; i++) out[i] = known[i]!;
  for (let i = first - 1; i >= 0; i--) out[i] = out[i + 1]! - 1;
  for (let i = last + 1; i < items.length; i++) out[i] = out[i - 1]! + 1;
  return out;
};

const CHUNK = 400;

/** Writes every change made since the last call. Cheap when nothing changed. Returns how many records it wrote. */
export const syncAll = async (): Promise<number> => {
  const statements: InStatement[] = [];
  const afterWrite: (() => void)[] = [];

  for (const list of lists.values()) {
    const seen = new Set<string>();
    const positions = positionsFor(list);
    list.items.forEach((item, i) => {
      const pos = positions[i]!;
      seen.add(item.id);
      const json = JSON.stringify(item);
      const prev = list.written.get(item.id);
      if (!prev || prev.pos !== pos || prev.json !== json) {
        if (!prev && !unmarked.has(list.name)) {
          // A record this process thinks is new. If another instance already took that id (two instances making a
          // counter-numbered record at the same instant), abort the whole write instead of overwriting theirs.
          statements.push({
            sql: "INSERT INTO guard (x) SELECT 1 WHERE EXISTS (SELECT 1 FROM docs WHERE collection = ? AND id = ? AND deleted = 0)",
            args: [list.name, item.id],
          });
        }
        statements.push({
          sql: `INSERT INTO docs (collection, id, pos, json, ver, deleted) VALUES (?, ?, ?, ?, ${VER}, 0)
                ON CONFLICT(collection, id) DO UPDATE SET pos = excluded.pos, json = excluded.json, ver = excluded.ver, deleted = 0`,
          args: [list.name, item.id, pos, json],
        });
        afterWrite.push(() => list.written.set(item.id, { pos, json }));
      }
    });
    for (const id of [...list.written.keys()]) {
      if (!seen.has(id)) {
        // Kept as a marker, so other instances learn it was deleted.
        statements.push({
          sql: `UPDATE docs SET deleted = 1, ver = ${VER} WHERE collection = ? AND id = ?`,
          args: [list.name, id],
        });
        afterWrite.push(() => list.written.delete(id));
      }
    }
  }
  const upsertKv = (key: string, json: string) =>
    ({
      sql: `INSERT INTO kv (key, json, ver) VALUES (?, ?, ${VER}) ON CONFLICT(key) DO UPDATE SET json = excluded.json, ver = excluded.ver`,
      args: [key, json],
    }) satisfies InStatement;
  for (const v of values.values()) {
    const json = JSON.stringify(v.box.value);
    if (json !== v.written) {
      statements.push(upsertKv(v.key, json));
      afterWrite.push(() => {
        v.written = json;
      });
    }
  }
  for (const name of unmarked) {
    statements.push(upsertKv(seededKey(name), "true"));
    afterWrite.push(() => unmarked.delete(name));
  }
  if (!statements.length) return 0;

  try {
    // One transaction per chunk; each starts by bumping the version, so a normal request is a single atomic batch.
    for (let at = 0; at < statements.length; at += CHUNK) {
      await batch([BUMP, ...statements.slice(at, at + CHUNK)]);
    }
  } catch (e) {
    dirty = true;
    throw e;
  }
  afterWrite.forEach((fn) => fn());
  return statements.length;
};

/** Brings this process up to date with writes other instances made. `force` reloads everything. */
export const refresh = async ({ force = false }: { force?: boolean } = {}) => {
  const head = (await get<{ n: number }>("SELECT n FROM meta WHERE key = 'ver'"))?.n ?? 0;
  const reload = force || dirty;
  if (!reload && head <= lastSeen) return 0;

  const since = reload ? 0 : lastSeen;
  const docs = await all<DocRow>(
    "SELECT collection, id, pos, json, deleted FROM docs WHERE ver > ? AND ver <= ? ORDER BY collection, pos",
    [since, head],
  );
  const kvs = await all<{ key: string; json: string }>("SELECT key, json FROM kv WHERE ver > ? AND ver <= ?", [since, head]);

  const byCollection = new Map<string, DocRow[]>();
  for (const d of docs) byCollection.set(d.collection, [...(byCollection.get(d.collection) ?? []), d]);

  for (const list of lists.values()) {
    const changes = byCollection.get(list.name) ?? [];
    let touched = false;
    const live = new Set<string>();

    for (const d of changes) {
      const idx = list.items.findIndex((it) => it.id === d.id);
      if (d.deleted) {
        if (idx >= 0) {
          list.items.splice(idx, 1);
          touched = true;
        }
        list.written.delete(d.id);
        continue;
      }
      live.add(d.id);
      const prev = list.written.get(d.id);
      if (!reload && idx >= 0 && prev && prev.json === d.json && prev.pos === d.pos) continue; // our own write, already here
      const next = JSON.parse(d.json) as { id: string };
      if (idx >= 0) {
        // Update in place, so anything holding a reference to this record sees the change.
        const cur = list.items[idx] as Record<string, unknown>;
        for (const k of Object.keys(cur)) delete cur[k];
        Object.assign(cur, next);
      } else {
        list.items.push(next);
      }
      list.written.set(d.id, { pos: d.pos, json: d.json });
      touched = true;
    }

    if (reload) {
      // A full reload also drops anything held in memory that the database doesn't have (a write that never landed).
      for (let i = list.items.length - 1; i >= 0; i--) {
        if (!live.has(list.items[i]!.id)) {
          list.written.delete(list.items[i]!.id);
          list.items.splice(i, 1);
          touched = true;
        }
      }
    }
    if (touched) list.items.sort((a, b) => (list.written.get(a.id)?.pos ?? 0) - (list.written.get(b.id)?.pos ?? 0));
  }

  for (const k of kvs) {
    const v = values.get(k.key);
    if (v && v.written !== k.json) {
      v.box.value = JSON.parse(k.json);
      v.written = k.json;
    }
  }

  lastSeen = head;
  dirty = false;
  return docs.length + kvs.length;
};

/** Marks memory as possibly ahead of the database, so the next request reloads from it. */
export const markDirty = () => {
  dirty = true;
};
