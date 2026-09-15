import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface SqliteStatement {
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
  all: (...params: unknown[]) => Record<string, unknown>[];
}

export interface SqliteDb {
  prepare: (sql: string) => SqliteStatement;
  close?: () => void;
}

/**
 * Open a read-oriented SQLite database.
 * Prefers Node 22+ `node:sqlite`, then better-sqlite3.
 */
export function openDatabase(dbPath: string): SqliteDb {
  try {
    const mod = require("node:sqlite") as {
      DatabaseSync?: new (path: string, opts?: { readOnly?: boolean }) => SqliteDb;
    };
    if (mod?.DatabaseSync) {
      try {
        return new mod.DatabaseSync(dbPath, { readOnly: true });
      } catch {
        return new mod.DatabaseSync(dbPath);
      }
    }
  } catch {
    // continue to better-sqlite3
  }

  try {
    const Database = require("better-sqlite3") as new (
      path: string,
      opts?: { readonly?: boolean }
    ) => SqliteDb;
    try {
      return new Database(dbPath, { readonly: true });
    } catch {
      return new Database(dbPath);
    }
  } catch {
    throw new Error(
      "No SQLite backend available. Use Node.js 22+ (built-in node:sqlite) or install better-sqlite3."
    );
  }
}

export function withSqlite<T>(dbPath: string, fn: (db: SqliteDb) => T): T {
  const db = openDatabase(dbPath);
  try {
    return fn(db);
  } finally {
    db.close?.();
  }
}

function cellToString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8");
  }
  return undefined;
}

export function readItem(db: SqliteDb, key: string): string | undefined {
  const row = db.prepare("SELECT value FROM ItemTable WHERE key = ?").get(key);
  return cellToString(row?.value);
}

export function listItemsLike(
  db: SqliteDb,
  keyLike: string
): Array<{ key: string; value: string }> {
  const rows = db.prepare("SELECT key, value FROM ItemTable WHERE key LIKE ?").all(keyLike);
  const out: Array<{ key: string; value: string }> = [];
  for (const row of rows) {
    const key = typeof row.key === "string" ? row.key : undefined;
    const value = cellToString(row.value);
    if (!key || value == null) continue;
    out.push({ key, value });
  }
  return out;
}
