import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
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
import { imageHashes } from "@/db/schema";
import type { CardPlayer } from "@/db/schema";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

const sampleCard = {
  players: [{ name: "Mike Trout", team: "Angels" }] as CardPlayer[],
  year: 2023,
  brand: "Topps",
  setName: "Chrome",
  cardNumber: "1",
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
    expect((card.players as CardPlayer[])[0].name).toBe("Mike Trout");
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
    expect((found!.players as CardPlayer[])[0].name).toBe("Mike Trout");
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
    createCard(db, { ...sampleCard, players: [{ name: "Shohei Ohtani" }] });

    const all = listCards(db);
    expect(all).toHaveLength(2);
  });

  it("should filter by sport", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, players: [{ name: "Connor McDavid" }], sport: "hockey" });

    const baseball = listCards(db, { sport: "baseball" });
    expect(baseball).toHaveLength(1);
    expect((baseball[0].players as CardPlayer[])[0].name).toBe("Mike Trout");
  });

  it("should filter by location", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, players: [{ name: "Ohtani" }], location: "Box 2" });

    const box1 = listCards(db, { location: "Box 1" });
    expect(box1).toHaveLength(1);
  });

  it("should filter by tag", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, tags: ["PC", "rookie"] });
    createCard(db, { ...sampleCard, players: [{ name: "Ohtani" }], tags: ["auto"] });
    createCard(db, { ...sampleCard, players: [{ name: "Judge" }], tags: ["PC", "auto"] });

    const pcCards = listCards(db, { tag: "PC" });
    expect(pcCards).toHaveLength(2);
    const names = pcCards.map((c) => (c.players as CardPlayer[])[0].name).sort();
    expect(names).toEqual(["Judge", "Mike Trout"]);

    const autoCards = listCards(db, { tag: "auto" });
    expect(autoCards).toHaveLength(2);
    const autoNames = autoCards.map((c) => (c.players as CardPlayer[])[0].name).sort();
    expect(autoNames).toEqual(["Judge", "Ohtani"]);
  });

  it("should sort by purchase price descending", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, purchasePrice: 10 });
    createCard(db, { ...sampleCard, players: [{ name: "Ohtani" }], purchasePrice: 50 });

    const sorted = listCards(db, { sortBy: "purchasePrice", sortOrder: "desc" });
    expect(sorted[0].purchasePrice).toBe(50);
  });

  it("should sort nulls last when sorting by purchase price ascending", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, players: [{ name: "NullPrice" }], purchasePrice: undefined });
    createCard(db, { ...sampleCard, players: [{ name: "LowPrice" }], purchasePrice: 0.02 });
    createCard(db, { ...sampleCard, players: [{ name: "HighPrice" }], purchasePrice: 50 });

    const sorted = listCards(db, { sortBy: "purchasePrice", sortOrder: "asc" });
    expect(sorted[0].purchasePrice).toBe(0.02);
    expect(sorted[1].purchasePrice).toBe(50);
    expect(sorted[2].purchasePrice).toBeNull();
  });

  it("should sort nulls last when sorting by purchase price descending", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, players: [{ name: "NullPrice" }], purchasePrice: undefined });
    createCard(db, { ...sampleCard, players: [{ name: "LowPrice" }], purchasePrice: 0.02 });
    createCard(db, { ...sampleCard, players: [{ name: "HighPrice" }], purchasePrice: 50 });

    const sorted = listCards(db, { sortBy: "purchasePrice", sortOrder: "desc" });
    expect(sorted[0].purchasePrice).toBe(50);
    expect(sorted[1].purchasePrice).toBe(0.02);
    expect(sorted[2].purchasePrice).toBeNull();
  });
});

describe("listCards with q (text search)", () => {
  it("should search by player name", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, players: [{ name: "Shohei Ohtani" }] });

    const results = listCards(db, { q: "trout" });
    expect(results).toHaveLength(1);
    expect((results[0].players as CardPlayer[])[0].name).toBe("Mike Trout");
  });

  it("should search across multiple fields", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, notes: "great card from LCS" });

    const results = listCards(db, { q: "LCS" });
    expect(results).toHaveLength(1);
  });

  it("should combine text search with tag filter", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, players: [{ name: "Mike Trout" }], tags: ["PC", "rookie"] });
    createCard(db, { ...sampleCard, players: [{ name: "Mike Schmidt" }], tags: ["HOF"] });
    createCard(db, { ...sampleCard, players: [{ name: "Shohei Ohtani" }], tags: ["PC"] });

    const results = listCards(db, { q: "Mike", tag: "PC" });
    expect(results).toHaveLength(1);
    expect((results[0].players as CardPlayer[])[0].name).toBe("Mike Trout");
  });

  it("should filter by team via players array", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, players: [{ name: "Mike Trout", team: "Angels" }] });
    createCard(db, { ...sampleCard, players: [{ name: "Shohei Ohtani", team: "Dodgers" }] });

    const results = listCards(db, { team: "Angels" });
    expect(results).toHaveLength(1);
    expect((results[0].players as CardPlayer[])[0].name).toBe("Mike Trout");
  });

  it("should find multi-player card when filtering by any player's team", () => {
    const db = freshDb();
    createCard(db, {
      ...sampleCard,
      players: [
        { name: "Mike Trout", team: "Angels" },
        { name: "Shohei Ohtani", team: "Dodgers" },
      ],
    });

    const byAngels = listCards(db, { team: "Angels" });
    expect(byAngels).toHaveLength(1);

    const byDodgers = listCards(db, { team: "Dodgers" });
    expect(byDodgers).toHaveLength(1);
  });
});

describe("updateCard", () => {
  it("should update specified fields", () => {
    const db = freshDb();
    const card = createCard(db, sampleCard);

    const updated = updateCard(db, card.id, { location: "Box 5", purchasePrice: 30 });
    expect(updated!.location).toBe("Box 5");
    expect(updated!.purchasePrice).toBe(30);
    expect((updated!.players as CardPlayer[])[0].name).toBe("Mike Trout");
  });
});

describe("renameTag", () => {
  it("should rename a tag on all cards that have it", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, players: [{ name: "Trout" }], tags: ["first basemen", "PC"] });
    createCard(db, { ...sampleCard, players: [{ name: "Ohtani" }], tags: ["first basemen"] });
    createCard(db, { ...sampleCard, players: [{ name: "Judge" }], tags: ["PC"] });

    const updated = renameTag(db, "first basemen", "1b");
    expect(updated).toBe(2);

    const all = listCards(db);
    const trout = all.find((c) => (c.players as CardPlayer[])[0].name === "Trout")!;
    const ohtani = all.find((c) => (c.players as CardPlayer[])[0].name === "Ohtani")!;
    const judge = all.find((c) => (c.players as CardPlayer[])[0].name === "Judge")!;

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
    createCard(db, { ...sampleCard, players: [{ name: "Trout" }], location: "Box 1" });
    createCard(db, { ...sampleCard, players: [{ name: "Ohtani" }], location: "Box 1" });
    createCard(db, { ...sampleCard, players: [{ name: "Judge" }], location: "Box 2" });

    const updated = renameLocation(db, "Box 1", "Binder A");
    expect(updated).toBe(2);

    const all = listCards(db);
    const trout = all.find((c) => (c.players as CardPlayer[])[0].name === "Trout")!;
    const ohtani = all.find((c) => (c.players as CardPlayer[])[0].name === "Ohtani")!;
    const judge = all.find((c) => (c.players as CardPlayer[])[0].name === "Judge")!;

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

  it("should remove image hashes for deleted card's images so they can be re-uploaded", () => {
    const db = freshDb();
    const card = createCard(db, {
      ...sampleCard,
      imageFront: "/uploads/front.jpg",
      imageBack: "/uploads/back.jpg",
    });
    db.insert(imageHashes).values({ hash: "abc123", imagePath: "/uploads/front.jpg" }).run();
    db.insert(imageHashes).values({ hash: "def456", imagePath: "/uploads/back.jpg" }).run();

    deleteCard(db, card.id);

    const frontHash = db.select().from(imageHashes).where(eq(imageHashes.hash, "abc123")).get();
    const backHash = db.select().from(imageHashes).where(eq(imageHashes.hash, "def456")).get();
    expect(frontHash).toBeUndefined();
    expect(backHash).toBeUndefined();
  });
});
