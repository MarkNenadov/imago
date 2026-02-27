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

  it("should derive decade from card year, not just tags", () => {
    const db = freshDb();
    createCard(db, { playerName: "Trout", sport: "baseball", year: 2020 });
    createCard(db, { playerName: "Ripken", sport: "baseball", year: 1990 });
    createCard(db, { playerName: "Ruth", sport: "baseball", year: 1930 });

    const stats = getCollectionStats(db);

    expect(stats.byDecade["2020s"]).toBe(1);
    expect(stats.byDecade["1990s"]).toBe(1);
    expect(stats.byDecade["1930s"]).toBe(1);
    expect(stats.byDecade["Other"]).toBeUndefined();
  });

  it("should count hockey positions in batterVsPitcher", () => {
    const db = freshDb();
    createCard(db, { playerName: "McDavid", sport: "hockey", tags: ["forward"] });
    createCard(db, { playerName: "Crosby", sport: "hockey", tags: ["forward"] });
    createCard(db, { playerName: "Pronger", sport: "hockey", tags: ["defenseman"] });
    createCard(db, { playerName: "Roy", sport: "hockey", tags: ["goalie"] });

    const stats = getCollectionStats(db);

    expect(stats.batterVsPitcher["Forward"]).toBe(2);
    expect(stats.batterVsPitcher["Defenseman"]).toBe(1);
    expect(stats.batterVsPitcher["Goalie"]).toBe(1);
    expect(stats.batterVsPitcher["Unknown"]).toBeUndefined();
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
