import { describe, it, expect } from "vitest";
import type { Card, CardPlayer } from "@/db/schema";
import { groupDuplicateCards } from "@/lib/duplicates";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "test-id",
    players: [{ name: "Mike Schmidt", team: "Phillies" }] as CardPlayer[],
    year: 1990,
    brand: "Topps",
    setName: null,
    cardNumber: null,
    sport: "baseball",
    variant: null,
    condition: null,
    purchasePrice: null,
    purchaseDate: null,
    purchaseSource: null,
    location: null,
    imageFront: null,
    imageBack: null,
    notes: null,
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("groupDuplicateCards", () => {
  it("should return empty array when no duplicates exist", () => {
    const cards = [
      makeCard({ id: "1", players: [{ name: "Mike Schmidt" }], year: 1990 }),
      makeCard({ id: "2", players: [{ name: "Nolan Ryan" }], year: 1990 }),
    ];

    expect(groupDuplicateCards(cards)).toEqual([]);
  });

  it("should group cards with same player, year, brand, and set", () => {
    const cards = [
      makeCard({ id: "1", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Topps" }),
      makeCard({ id: "2", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Topps" }),
    ];

    const groups = groupDuplicateCards(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0].cards).toHaveLength(2);
    expect(groups[0].playerName).toBe("Mike Schmidt");
    expect(groups[0].year).toBe(1990);
    expect(groups[0].brand).toBe("Topps");
  });

  it("should not group cards with different brands", () => {
    const cards = [
      makeCard({ id: "1", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Topps" }),
      makeCard({ id: "2", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Donruss" }),
    ];

    expect(groupDuplicateCards(cards)).toEqual([]);
  });

  it("should match case-insensitively", () => {
    const cards = [
      makeCard({ id: "1", players: [{ name: "Mike Schmidt" }], brand: "topps" }),
      makeCard({ id: "2", players: [{ name: "mike schmidt" }], brand: "Topps" }),
    ];

    const groups = groupDuplicateCards(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0].cards).toHaveLength(2);
  });

  it("should treat null fields as equal", () => {
    const cards = [
      makeCard({ id: "1", players: [{ name: "Mike Schmidt" }], year: null, brand: null, setName: null }),
      makeCard({ id: "2", players: [{ name: "Mike Schmidt" }], year: null, brand: null, setName: null }),
    ];

    const groups = groupDuplicateCards(cards);
    expect(groups).toHaveLength(1);
  });

  it("should handle multiple duplicate groups", () => {
    const cards = [
      makeCard({ id: "1", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Topps" }),
      makeCard({ id: "2", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Topps" }),
      makeCard({ id: "3", players: [{ name: "Nolan Ryan" }], year: 1988, brand: "Donruss" }),
      makeCard({ id: "4", players: [{ name: "Nolan Ryan" }], year: 1988, brand: "Donruss" }),
      makeCard({ id: "5", players: [{ name: "Ken Griffey Jr." }], year: 1989, brand: "Upper Deck" }),
    ];

    const groups = groupDuplicateCards(cards);
    expect(groups).toHaveLength(2);
  });

  it("should handle groups with 3+ duplicates", () => {
    const cards = [
      makeCard({ id: "1", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Topps" }),
      makeCard({ id: "2", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Topps" }),
      makeCard({ id: "3", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Topps" }),
    ];

    const groups = groupDuplicateCards(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0].cards).toHaveLength(3);
  });

  it("should include setName in grouping key", () => {
    const cards = [
      makeCard({ id: "1", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Topps", setName: "Traded" }),
      makeCard({ id: "2", players: [{ name: "Mike Schmidt" }], year: 1990, brand: "Topps", setName: "Base" }),
    ];

    expect(groupDuplicateCards(cards)).toEqual([]);
  });

  it("should return empty array for empty input", () => {
    expect(groupDuplicateCards([])).toEqual([]);
  });
});
