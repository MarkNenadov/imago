import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { createCard } from "@/db/cards";
import { getCollectionStats } from "@/db/stats";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

describe("getCollectionStats", () => {
  it("should return zero stats for empty collection", () => {
    const db = freshDb();
    const stats = getCollectionStats(db);

    expect(stats.totalCards).toBe(0);
    expect(stats.totalInvested).toBe(0);
    expect(stats.bySport).toEqual({});
    expect(stats.byLocation).toEqual({});
  });

  it("should calculate stats correctly", () => {
    const db = freshDb();
    createCard(db, { playerName: "Trout", sport: "baseball", purchasePrice: 25, location: "Box 1" });
    createCard(db, { playerName: "Ohtani", sport: "baseball", purchasePrice: 50, location: "Box 2" });
    createCard(db, { playerName: "McDavid", sport: "hockey", purchasePrice: 30, location: "Box 1" });

    const stats = getCollectionStats(db);

    expect(stats.totalCards).toBe(3);
    expect(stats.totalInvested).toBe(105);
    expect(stats.bySport).toEqual({ baseball: 2, hockey: 1 });
    expect(stats.byLocation).toEqual({ "Box 1": 2, "Box 2": 1 });
  });
});
