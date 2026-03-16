import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { createCard, listCards, getCardById, deleteCard } from "@/db/cards";
import type { CardPlayer } from "@/db/schema";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

describe("GET /api/cards behavior", () => {
  it("should return empty array when no cards exist", () => {
    const db = freshDb();
    const result = listCards(db);
    expect(result).toEqual([]);
  });

  it("should return cards filtered by sport query param", () => {
    const db = freshDb();
    createCard(db, { players: [{ name: "Trout" }], sport: "baseball" });
    createCard(db, { players: [{ name: "McDavid" }], sport: "hockey" });

    const result = listCards(db, { sport: "baseball" });
    expect(result).toHaveLength(1);
    expect((result[0].players as CardPlayer[])[0].name).toBe("Trout");
  });
});

describe("POST /api/cards behavior", () => {
  it("should create a card with valid data", () => {
    const db = freshDb();
    const card = createCard(db, { players: [{ name: "Trout" }], sport: "baseball" });
    expect(card.id).toBeDefined();
    expect((card.players as CardPlayer[])[0].name).toBe("Trout");
  });
});

describe("DELETE /api/cards/[id] behavior", () => {
  it("should return false for non-existent card", () => {
    const db = freshDb();
    expect(deleteCard(db, "fake-id")).toBe(false);
  });

  it("should delete an existing card", () => {
    const db = freshDb();
    const card = createCard(db, { players: [{ name: "Trout" }], sport: "baseball" });
    expect(deleteCard(db, card.id)).toBe(true);
    expect(getCardById(db, card.id)).toBeUndefined();
  });
});
