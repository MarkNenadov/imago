import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { searchReferenceCards } from "@/db/reference";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

describe("searchReferenceCards", () => {
  it("should return empty array when no reference data exists", () => {
    const db = freshDb();
    const results = searchReferenceCards(db, "trout");
    expect(results).toEqual([]);
  });
});
