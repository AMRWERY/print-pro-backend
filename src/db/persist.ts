import { db, tx } from "./index";

/**
 * The domain modules keep their working state in plain arrays and objects (their query and
 * validation logic is unchanged). This layer makes that state durable: it is loaded from
 * SQLite at boot (or seeded on first run), and `syncAll()` writes back only what changed.
 * One API process owns the database; run a single instance.
 */

interface ListEntry {
  name: string;
  items: { id: string }[];
  /** id -> position + serialized doc as last written. */
  written: Map<string, { pos: number; json: string }>;
}
interface ValueEntry {
  key: string;
  box: { value: unknown };
  written: string;
}

const lists: ListEntry[] = [];
/** Collections seeded in this process whose "already seeded" marker still has to be written. */
const unmarked = new Set<string>();
const values: ValueEntry[] = [];

const selectDocs = db.prepare("SELECT id, pos, json FROM docs WHERE collection = ? ORDER BY pos");
const upsertDoc = db.prepare(
  "INSERT INTO docs (collection, id, pos, json) VALUES (?, ?, ?, ?) ON CONFLICT(collection, id) DO UPDATE SET pos = excluded.pos, json = excluded.json",
);
const deleteDoc = db.prepare("DELETE FROM docs WHERE collection = ? AND id = ?");
const selectKv = db.prepare("SELECT json FROM kv WHERE key = ?");
const upsertKv = db.prepare(
  "INSERT INTO kv (key, json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json",
);

const seededKey = (name: string) => `seeded:${name}`;

/** A durable array of documents. `seed` runs only when the collection has never been saved. */
export const persistentList = <T extends { id: string }>(name: string, seed: () => T[]): T[] => {
  const rows = selectDocs.all(name) as { id: string; pos: number; json: string }[];
  const written = new Map<string, { pos: number; json: string }>();
  let items: T[];
  if (rows.length) {
    items = rows.map((r) => {
      written.set(r.id, { pos: r.pos, json: r.json });
      return JSON.parse(r.json) as T;
    });
  } else if (selectKv.get(seededKey(name))) {
    // Seeded before and since emptied by an admin: stay empty rather than bringing demo data back.
    items = [];
  } else {
    items = seed();
    unmarked.add(name);
  }
  lists.push({ name, items, written });
  return items;
};

/** A durable single value (settings, a counter). Read and write `box.value`. */
export const persistentValue = <T>(key: string, init: () => T): { value: T } => {
  const row = selectKv.get(key) as { json: string } | undefined;
  const box = { value: row ? (JSON.parse(row.json) as T) : init() };
  values.push({ key, box, written: row?.json ?? "" });
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

/** Writes every change made since the last call, atomically. Cheap when nothing changed. */
export const syncAll = () => {
  const pending: (() => void)[] = [];
  for (const list of lists) {
    const seen = new Set<string>();
    const positions = positionsFor(list);
    list.items.forEach((item, i) => {
      const pos = positions[i]!;
      seen.add(item.id);
      const json = JSON.stringify(item);
      const prev = list.written.get(item.id);
      if (!prev || prev.pos !== pos || prev.json !== json) {
        pending.push(() => {
          upsertDoc.run(list.name, item.id, pos, json);
          list.written.set(item.id, { pos, json });
        });
      }
    });
    for (const id of [...list.written.keys()]) {
      if (!seen.has(id)) {
        pending.push(() => {
          deleteDoc.run(list.name, id);
          list.written.delete(id);
        });
      }
    }
  }
  for (const v of values) {
    const json = JSON.stringify(v.box.value);
    if (json !== v.written) {
      pending.push(() => {
        upsertKv.run(v.key, json);
        v.written = json;
      });
    }
  }
  for (const name of unmarked) {
    pending.push(() => {
      upsertKv.run(seededKey(name), "true");
      unmarked.delete(name);
    });
  }
  if (pending.length) tx(() => pending.forEach((fn) => fn()));
  return pending.length;
};
