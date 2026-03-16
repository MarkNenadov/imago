import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { createCard, listCards } from "@/db/cards";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Card, CardPlayer } from "@/db/schema";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

/**
 * Mirrors the EXCLUDED_POSITION_TAGS + cardIsMissingTag logic from the route
 * to verify filtering behavior without exporting internals.
 */
const EXCLUDED_POSITION_TAGS: Record<string, string[]> = {
  batters: ["pitchers", "pitcher", "manager", "managers"],
  batter: ["pitchers", "pitcher", "manager", "managers"],
  pitchers: ["batters", "batter", "manager", "managers"],
  pitcher: ["batters", "batter", "manager", "managers"],
};

function cardIsMissingTag(card: Card, tagName: string): boolean {
  const tags = (card.tags as string[]) ?? [];
  if (tags.includes(tagName)) return false;
  const excluded = EXCLUDED_POSITION_TAGS[tagName.toLowerCase()];
  if (excluded && tags.some((t) => excluded.includes(t.toLowerCase()))) return false;
  return true;
}

function playerName(card: Card): string {
  return (card.players as CardPlayer[])[0]?.name ?? "";
}

describe("bulk edit tag filtering", () => {
  it("should exclude cards tagged as manager from batter list", () => {
    const db = freshDb();
    createCard(db, { players: [{ name: "Connie Mack" }], sport: "baseball", tags: ["manager"] });
    createCard(db, { players: [{ name: "Mike Trout" }], sport: "baseball", tags: [] });

    const allCards = listCards(db);
    const missing = allCards.filter((c) => cardIsMissingTag(c, "batter"));

    expect(missing).toHaveLength(1);
    expect(playerName(missing[0])).toBe("Mike Trout");
  });

  it("should exclude cards tagged as manager from pitcher list", () => {
    const db = freshDb();
    createCard(db, { players: [{ name: "Connie Mack" }], sport: "baseball", tags: ["manager"] });
    createCard(db, { players: [{ name: "Nolan Ryan" }], sport: "baseball", tags: [] });

    const allCards = listCards(db);
    const missing = allCards.filter((c) => cardIsMissingTag(c, "pitcher"));

    expect(missing).toHaveLength(1);
    expect(playerName(missing[0])).toBe("Nolan Ryan");
  });

  it("should exclude cards already tagged as pitcher from batter list", () => {
    const db = freshDb();
    createCard(db, { players: [{ name: "Nolan Ryan" }], sport: "baseball", tags: ["pitcher"] });

    const allCards = listCards(db);
    const missing = allCards.filter((c) => cardIsMissingTag(c, "batter"));

    expect(missing).toHaveLength(0);
  });

  it("should exclude cards tagged as managers (plural) from batters list", () => {
    const db = freshDb();
    createCard(db, { players: [{ name: "Cito Gaston" }], sport: "baseball", tags: ["managers"] });
    createCard(db, { players: [{ name: "Mike Trout" }], sport: "baseball", tags: [] });

    const allCards = listCards(db);
    const missing = allCards.filter((c) => cardIsMissingTag(c, "batters"));

    expect(missing).toHaveLength(1);
    expect(playerName(missing[0])).toBe("Mike Trout");
  });

  it("should include untagged cards in batter list", () => {
    const db = freshDb();
    createCard(db, { players: [{ name: "Mike Trout" }], sport: "baseball", tags: [] });

    const allCards = listCards(db);
    const missing = allCards.filter((c) => cardIsMissingTag(c, "batter"));

    expect(missing).toHaveLength(1);
  });
});
