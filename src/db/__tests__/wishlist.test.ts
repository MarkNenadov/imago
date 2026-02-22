import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  createWishlistItem,
  listWishlistItems,
  deleteWishlistItem,
  getWishlistItemById,
} from "@/db/wishlist";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

describe("createWishlistItem", () => {
  it("creates an item with required field only", () => {
    const db = freshDb();
    const item = createWishlistItem(db, { playerName: "Rickey Henderson" });
    expect(item.id).toBeDefined();
    expect(item.playerName).toBe("Rickey Henderson");
    expect(item.year).toBeNull();
  });

  it("creates an item with all optional fields", () => {
    const db = freshDb();
    const item = createWishlistItem(db, {
      playerName: "Rickey Henderson",
      year: 1986,
      brand: "Topps",
      setName: "Topps Traded",
      cardNumber: "50T",
      variant: "Tiffany",
    });
    expect(item.year).toBe(1986);
    expect(item.brand).toBe("Topps");
    expect(item.cardNumber).toBe("50T");
  });
});

describe("listWishlistItems", () => {
  it("returns empty array when no items exist", () => {
    const db = freshDb();
    expect(listWishlistItems(db)).toEqual([]);
  });

  it("returns all items sorted by playerName then year", () => {
    const db = freshDb();
    createWishlistItem(db, { playerName: "Rickey Henderson", year: 1986 });
    createWishlistItem(db, { playerName: "Rickey Henderson", year: 1984 });
    createWishlistItem(db, { playerName: "Wade Boggs", year: 1983 });

    const items = listWishlistItems(db);
    expect(items).toHaveLength(3);
    expect(items[0].playerName).toBe("Rickey Henderson");
    expect(items[0].year).toBe(1984);
    expect(items[1].playerName).toBe("Rickey Henderson");
    expect(items[1].year).toBe(1986);
    expect(items[2].playerName).toBe("Wade Boggs");
    expect(items[2].year).toBe(1983);
  });
});

describe("deleteWishlistItem", () => {
  it("returns false for non-existent item", () => {
    const db = freshDb();
    expect(deleteWishlistItem(db, "fake-id")).toBe(false);
  });

  it("deletes an existing item", () => {
    const db = freshDb();
    const item = createWishlistItem(db, { playerName: "Rickey Henderson" });
    expect(deleteWishlistItem(db, item.id)).toBe(true);
    expect(getWishlistItemById(db, item.id)).toBeUndefined();
  });
});
