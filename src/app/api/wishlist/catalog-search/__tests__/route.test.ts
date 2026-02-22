import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createCard } from "@/db/cards";
import { createWishlistItem } from "@/db/wishlist";
import { filterCatalogGaps } from "@/app/api/wishlist/catalog-search/filter";
import type { CatalogCard } from "@/lib/card-catalog";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

const CATALOG: CatalogCard[] = [
  { playerName: "Rickey Henderson", year: 1982, brand: "Topps", cardNumber: "610" },
  { playerName: "Rickey Henderson", year: 1984, brand: "Topps", cardNumber: "230" },
  { playerName: "Rickey Henderson", year: 1986, brand: "Topps", cardNumber: "500" },
];

describe("filterCatalogGaps", () => {
  it("returns all catalog cards when collection and wishlist are empty", () => {
    const db = freshDb();
    const gaps = filterCatalogGaps(db, CATALOG);
    expect(gaps).toHaveLength(3);
  });

  it("excludes cards already in the collection", () => {
    const db = freshDb();
    createCard(db, {
      playerName: "Rickey Henderson",
      year: 1982,
      brand: "Topps",
      cardNumber: "610",
      sport: "baseball",
    });
    const gaps = filterCatalogGaps(db, CATALOG);
    expect(gaps).toHaveLength(2);
    expect(gaps.every((g) => g.year !== 1982)).toBe(true);
  });

  it("excludes cards already on the wishlist", () => {
    const db = freshDb();
    createWishlistItem(db, {
      playerName: "Rickey Henderson",
      year: 1984,
      brand: "Topps",
      cardNumber: "230",
    });
    const gaps = filterCatalogGaps(db, CATALOG);
    expect(gaps).toHaveLength(2);
    expect(gaps.every((g) => g.year !== 1984)).toBe(true);
  });

  it("excludes cards in both collection and wishlist", () => {
    const db = freshDb();
    createCard(db, {
      playerName: "Rickey Henderson",
      year: 1982,
      brand: "Topps",
      cardNumber: "610",
      sport: "baseball",
    });
    createWishlistItem(db, {
      playerName: "Rickey Henderson",
      year: 1986,
      brand: "Topps",
      cardNumber: "500",
    });
    const gaps = filterCatalogGaps(db, CATALOG);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].year).toBe(1984);
  });
});
