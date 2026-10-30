import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Client, InStatement, Row } from "@libsql/client";
import { config } from "../config";

/**
 * One libSQL database: a local SQLite file in development and tests, a hosted Turso database in production.
 * Remote URLs use the HTTP client, which has no native code and runs in serverless functions.
 */

let client: Client | undefined;

const remote = (url: string) => /^(libsql|https?|wss?):/.test(url);

const SCHEMA = `
  -- Documents of every domain collection (products, orders, ...), kept in display order.
  -- ver: the database version at which the row last changed, so other API instances can pull only what's new.
  CREATE TABLE IF NOT EXISTS docs (
    collection TEXT NOT NULL,
    id         TEXT NOT NULL,
    pos        INTEGER NOT NULL,
    json       TEXT NOT NULL,
    ver        INTEGER NOT NULL DEFAULT 0,
    deleted    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (collection, id)
  );
  CREATE INDEX IF NOT EXISTS docs_ver ON docs (ver);

  -- Single values: settings, counters, and other non-list state.
  CREATE TABLE IF NOT EXISTS kv (
    key  TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    ver  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    n   INTEGER NOT NULL
  );
  INSERT OR IGNORE INTO meta (key, n) VALUES ('ver', 0);

  -- Inserting into this fails (CHECK), which aborts the whole write transaction. Used to detect an id taken by another instance.
  CREATE TABLE IF NOT EXISTS guard (x INTEGER CHECK (x = 0));

  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
    name        TEXT NOT NULL,
    studio      TEXT NOT NULL DEFAULT '',
    tier        TEXT NOT NULL DEFAULT 'home',
    title       TEXT,
    phone       TEXT,
    newsletter  INTEGER NOT NULL DEFAULT 0,
    hash        TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires    INTEGER NOT NULL
  );
`;

let opening: Promise<Client> | undefined;

/** Opens the database and creates the tables. Safe to call many times. */
export const openDb = (): Promise<Client> => {
  opening ??= (async () => {
    const url = config.dbUrl;
    let c: Client;
    if (remote(url)) {
      const { createClient } = await import("@libsql/client/web");
      c = createClient({ url, authToken: config.dbAuthToken });
    } else {
      if (url.startsWith("file:") && !url.startsWith("file::memory:")) {
        mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
      }
      const { createClient } = await import("@libsql/client");
      c = createClient({ url });
      // Another process (a second instance on the same file) may hold the write lock for a moment: wait instead of failing.
      await c.execute("PRAGMA busy_timeout = 5000");
    }
    // A database made by the first version has no version columns yet: add them before the schema runs.
    const docCols = await c.execute("PRAGMA table_info(docs)");
    const upgrade = docCols.rows.length > 0 && !docCols.rows.some((r) => r.name === "ver");
    if (upgrade) {
      await c.executeMultiple(`
        ALTER TABLE docs ADD COLUMN ver INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE docs ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE kv ADD COLUMN ver INTEGER NOT NULL DEFAULT 0;
      `);
    }
    await c.executeMultiple(SCHEMA);
    if (upgrade) {
      await c.executeMultiple(`
        UPDATE docs SET ver = 1 WHERE ver = 0;
        UPDATE kv SET ver = 1 WHERE ver = 0;
        UPDATE meta SET n = MAX(n, 1) WHERE key = 'ver';
      `);
    }
    client = c;
    return c;
  })();
  return opening;
};

export const closeDb = () => {
  client?.close();
  client = undefined;
  opening = undefined;
};

const need = () => {
  if (!client) throw new Error("Database is not open yet");
  return client;
};

export type { InStatement, Row };

/** First row of a query, or undefined. */
export const get = async <T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T | undefined> => {
  const r = await need().execute({ sql, args: args as never });
  const row = r.rows[0];
  return row ? ({ ...row } as T) : undefined;
};

/** Every row of a query. */
export const all = async <T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T[]> => {
  const r = await need().execute({ sql, args: args as never });
  return r.rows.map((row) => ({ ...row }) as T);
};

/** Runs a statement that changes data. */
export const run = async (sql: string, args: unknown[] = []) => {
  await need().execute({ sql, args: args as never });
};

/** Runs several statements as one transaction. */
export const batch = async (statements: InStatement[]) => {
  if (statements.length) await need().batch(statements, "write");
};
