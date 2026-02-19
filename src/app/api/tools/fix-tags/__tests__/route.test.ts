import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { createCard, getCardById } from "@/db/cards";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { normalizePlayerName } from "@/lib/hall-of-fame";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

describe("fix-tags name normalization", () => {
  it("should detect double-period Jr.. as needing normalization", () => {
    const db = freshDb();
    const card = createCard(db, {
      playerName: "Cal Ripken Jr..",
      sport: "baseball",
      tags: [],
    });

    const normalized = normalizePlayerName(card.playerName);
    expect(normalized).toBe("Cal Ripken Jr.");
    expect(normalized).not.toBe(card.playerName);
  });

  it("should not flag correctly normalized names", () => {
    const db = freshDb();
    const card = createCard(db, {
      playerName: "Cal Ripken Jr.",
      sport: "baseball",
      tags: [],
    });

    const normalized = normalizePlayerName(card.playerName);
    expect(normalized).toBe(card.playerName);
  });
});
