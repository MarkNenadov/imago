import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import {
  createCard,
  getCardById,
  listCards,
  updateCard,
  deleteCard,
  renameTag,
  renameLocation,
} from "@/db/cards";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

const sampleCard = {
  playerName: "Mike Trout",
  year: 2023,
  brand: "Topps",
  setName: "Chrome",
  cardNumber: "1",
  team: "Angels",
  sport: "baseball" as const,
  variant: "Refractor",
  purchasePrice: 25.0,
  location: "Box 1",
  tags: ["PC", "rookie"],
};

describe("createCard", () => {
  it("should create a card and return it with an id", () => {
    const db = freshDb();
    const card = createCard(db, sampleCard);

    expect(card.id).toBeDefined();
    expect(card.playerName).toBe("Mike Trout");
    expect(card.year).toBe(2023);
    expect(card.tags).toEqual(["PC", "rookie"]);
  });
});

describe("getCardById", () => {
  it("should return a card by id", () => {
    const db = freshDb();
    const created = createCard(db, sampleCard);
    const found = getCardById(db, created.id);

    expect(found).toBeDefined();
    expect(found!.playerName).toBe("Mike Trout");
  });

  it("should return undefined for non-existent id", () => {
    const db = freshDb();
    const found = getCardById(db, "non-existent");

    expect(found).toBeUndefined();
  });
});

describe("listCards", () => {
  it("should return all cards", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, playerName: "Shohei Ohtani" });

    const all = listCards(db);
    expect(all).toHaveLength(2);
  });

  it("should filter by sport", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, playerName: "Connor McDavid", sport: "hockey" });

    const baseball = listCards(db, { sport: "baseball" });
    expect(baseball).toHaveLength(1);
    expect(baseball[0].playerName).toBe("Mike Trout");
  });

  it("should filter by location", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, playerName: "Ohtani", location: "Box 2" });

    const box1 = listCards(db, { location: "Box 1" });
    expect(box1).toHaveLength(1);
  });

  it("should filter by tag", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, tags: ["PC", "rookie"] });
    createCard(db, { ...sampleCard, playerName: "Ohtani", tags: ["auto"] });
    createCard(db, { ...sampleCard, playerName: "Judge", tags: ["PC", "auto"] });

    const pcCards = listCards(db, { tag: "PC" });
    expect(pcCards).toHaveLength(2);
    expect(pcCards.map((c) => c.playerName).sort()).toEqual(["Judge", "Mike Trout"]);

    const autoCards = listCards(db, { tag: "auto" });
    expect(autoCards).toHaveLength(2);
    expect(autoCards.map((c) => c.playerName).sort()).toEqual(["Judge", "Ohtani"]);
  });

  it("should sort by purchase price descending", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, purchasePrice: 10 });
    createCard(db, { ...sampleCard, playerName: "Ohtani", purchasePrice: 50 });

    const sorted = listCards(db, { sortBy: "purchasePrice", sortOrder: "desc" });
    expect(sorted[0].purchasePrice).toBe(50);
  });
});

describe("listCards with q (text search)", () => {
  it("should search by player name", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, playerName: "Shohei Ohtani" });

    const results = listCards(db, { q: "trout" });
    expect(results).toHaveLength(1);
    expect(results[0].playerName).toBe("Mike Trout");
  });

  it("should search across multiple fields", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, notes: "great card from LCS" });

    const results = listCards(db, { q: "LCS" });
    expect(results).toHaveLength(1);
  });

  it("should combine text search with tag filter", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, playerName: "Mike Trout", tags: ["PC", "rookie"] });
    createCard(db, { ...sampleCard, playerName: "Mike Schmidt", tags: ["HOF"] });
    createCard(db, { ...sampleCard, playerName: "Shohei Ohtani", tags: ["PC"] });

    const results = listCards(db, { q: "Mike", tag: "PC" });
    expect(results).toHaveLength(1);
    expect(results[0].playerName).toBe("Mike Trout");
  });
});

describe("updateCard", () => {
  it("should update specified fields", () => {
    const db = freshDb();
    const card = createCard(db, sampleCard);

    const updated = updateCard(db, card.id, { location: "Box 5", purchasePrice: 30 });
    expect(updated!.location).toBe("Box 5");
    expect(updated!.purchasePrice).toBe(30);
    expect(updated!.playerName).toBe("Mike Trout");
  });
});

describe("renameTag", () => {
  it("should rename a tag on all cards that have it", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, playerName: "Trout", tags: ["first basemen", "PC"] });
    createCard(db, { ...sampleCard, playerName: "Ohtani", tags: ["first basemen"] });
    createCard(db, { ...sampleCard, playerName: "Judge", tags: ["PC"] });

    const updated = renameTag(db, "first basemen", "1b");
    expect(updated).toBe(2);

    const all = listCards(db);
    const trout = all.find((c) => c.playerName === "Trout")!;
    const ohtani = all.find((c) => c.playerName === "Ohtani")!;
    const judge = all.find((c) => c.playerName === "Judge")!;

    expect(trout.tags).toEqual(["PC", "1b"]);
    expect(ohtani.tags).toEqual(["1b"]);
    expect(judge.tags).toEqual(["PC"]);
  });

  it("should not duplicate if card already has the target tag", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, tags: ["old-tag", "new-tag"] });

    const updated = renameTag(db, "old-tag", "new-tag");
    expect(updated).toBe(1);

    const all = listCards(db);
    expect(all[0].tags).toEqual(["new-tag"]);
  });

  it("should return 0 when no cards have the source tag", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, tags: ["PC"] });

    const updated = renameTag(db, "nonexistent", "something");
    expect(updated).toBe(0);
  });
});

describe("renameLocation", () => {
  it("should rename location on all matching cards", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, playerName: "Trout", location: "Box 1" });
    createCard(db, { ...sampleCard, playerName: "Ohtani", location: "Box 1" });
    createCard(db, { ...sampleCard, playerName: "Judge", location: "Box 2" });

    const updated = renameLocation(db, "Box 1", "Binder A");
    expect(updated).toBe(2);

    const all = listCards(db);
    const trout = all.find((c) => c.playerName === "Trout")!;
    const ohtani = all.find((c) => c.playerName === "Ohtani")!;
    const judge = all.find((c) => c.playerName === "Judge")!;

    expect(trout.location).toBe("Binder A");
    expect(ohtani.location).toBe("Binder A");
    expect(judge.location).toBe("Box 2");
  });

  it("should return 0 when no cards match the source location", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, location: "Box 1" });

    const updated = renameLocation(db, "Box 99", "Binder A");
    expect(updated).toBe(0);
  });
});

describe("deleteCard", () => {
  it("should delete a card and return true", () => {
    const db = freshDb();
    const card = createCard(db, sampleCard);

    const deleted = deleteCard(db, card.id);
    expect(deleted).toBe(true);

    const found = getCardById(db, card.id);
    expect(found).toBeUndefined();
  });

  it("should return false for non-existent id", () => {
    const db = freshDb();
    const deleted = deleteCard(db, "non-existent");
    expect(deleted).toBe(false);
  });
});
