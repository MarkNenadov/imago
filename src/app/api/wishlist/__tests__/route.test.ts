import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  createWishlistItem,
  listWishlistItems,
  deleteWishlistItem,
} from "@/db/wishlist";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

describe("GET /api/wishlist behavior", () => {
  it("returns empty array when no items exist", () => {
    const db = freshDb();
    expect(listWishlistItems(db)).toEqual([]);
  });

  it("returns created items", () => {
    const db = freshDb();
    createWishlistItem(db, { playerName: "Rickey Henderson", year: 1986 });
    const items = listWishlistItems(db);
    expect(items).toHaveLength(1);
    expect(items[0].playerName).toBe("Rickey Henderson");
  });
});

describe("POST /api/wishlist behavior — bulk insert", () => {
  it("inserts multiple items at once", () => {
    const db = freshDb();
    createWishlistItem(db, { playerName: "Rickey Henderson", year: 1982 });
    createWishlistItem(db, { playerName: "Rickey Henderson", year: 1984 });
    expect(listWishlistItems(db)).toHaveLength(2);
  });
});

describe("DELETE /api/wishlist/[id] behavior", () => {
  it("returns false for non-existent item", () => {
    const db = freshDb();
    expect(deleteWishlistItem(db, "fake-id")).toBe(false);
  });

  it("deletes an existing item", () => {
    const db = freshDb();
    const item = createWishlistItem(db, { playerName: "Rickey Henderson" });
    expect(deleteWishlistItem(db, item.id)).toBe(true);
    expect(listWishlistItems(db)).toHaveLength(0);
  });
});
