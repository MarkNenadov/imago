import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb(url?: string) {
  if (dbInstance && !url) return dbInstance;

  const sqlite = new Database(url ?? "./imago.db");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });

  if (!url) {
    dbInstance = db;
  }

  return db;
}
