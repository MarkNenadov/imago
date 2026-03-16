import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { createCard, getCardById } from "@/db/cards";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { CardPlayer } from "@/db/schema";
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
      players: [{ name: "Cal Ripken Jr.." }],
      sport: "baseball",
      tags: [],
    });

    const name = (card.players as CardPlayer[])[0].name;
    const normalized = normalizePlayerName(name);
    expect(normalized).toBe("Cal Ripken Jr.");
    expect(normalized).not.toBe(name);
  });

  it("should not flag correctly normalized names", () => {
    const db = freshDb();
    const card = createCard(db, {
      players: [{ name: "Cal Ripken Jr." }],
      sport: "baseball",
      tags: [],
    });

    const name = (card.players as CardPlayer[])[0].name;
    const normalized = normalizePlayerName(name);
    expect(normalized).toBe(name);
  });
});
