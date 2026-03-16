import { describe, it, expect } from "vitest";
import { getMissingFields } from "@/lib/audit";
import type { Card, CardPlayer } from "@/db/schema";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "1",
    players: [{ name: "Ken Griffey Jr.", team: "Seattle Mariners" }] as CardPlayer[],
    year: 1989,
    brand: "Upper Deck",
    setName: "Base Set",
    cardNumber: "1",
    sport: "baseball",
    variant: null,
    condition: null,
    purchasePrice: 10.00,
    purchaseDate: "2024-01-01",
    purchaseSource: null,
    location: "Binder A",
    imageFront: "/uploads/front.jpg",
    imageBack: null,
    notes: null,
    tags: ["batters"],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

describe("getMissingFields", () => {
  it("returns empty array for a complete card", () => {
    expect(getMissingFields(makeCard())).toEqual([]);
  });

  it("flags missing purchase price", () => {
    expect(getMissingFields(makeCard({ purchasePrice: null }))).toContain("Price");
  });

  it("flags missing purchase date", () => {
    expect(getMissingFields(makeCard({ purchaseDate: null }))).toContain("Purchase Date");
  });

  it("flags missing team when no player has a team", () => {
    expect(getMissingFields(makeCard({ players: [{ name: "Ken Griffey Jr." }] }))).toContain("Team");
  });

  it("does not flag team when at least one player has a team", () => {
    const players: CardPlayer[] = [
      { name: "Player A", team: "Red Sox" },
      { name: "Player B" },
    ];
    expect(getMissingFields(makeCard({ players }))).not.toContain("Team");
  });

  it("flags missing location", () => {
    expect(getMissingFields(makeCard({ location: null }))).toContain("Location");
  });

  it("flags missing front image", () => {
    expect(getMissingFields(makeCard({ imageFront: null }))).toContain("Front Image");
  });

  it("flags missing position tag when tags are empty", () => {
    expect(getMissingFields(makeCard({ tags: [] }))).toContain("Position Tag");
  });

  it("flags missing position tag when no position tag present", () => {
    expect(getMissingFields(makeCard({ tags: ["HOF", "RC"] }))).toContain("Position Tag");
  });

  it("does not flag position tag for baseball position tags", () => {
    for (const tag of ["batters", "pitchers", "catchers", "hitters", "coaches", "managers", "shortstops"]) {
      expect(getMissingFields(makeCard({ tags: [tag] }))).not.toContain("Position Tag");
    }
  });

  it("does not flag position tag for hockey position tags", () => {
    for (const tag of ["forwards", "forward", "defencemen", "goalies", "goalie"]) {
      expect(getMissingFields(makeCard({ tags: [tag] }))).not.toContain("Position Tag");
    }
  });

  it("is case-insensitive for position tags", () => {
    expect(getMissingFields(makeCard({ tags: ["Forwards"] }))).not.toContain("Position Tag");
  });

  it("can return multiple missing fields", () => {
    const missing = getMissingFields(makeCard({ purchasePrice: null, players: [{ name: "Ken Griffey Jr." }], tags: [] }));
    expect(missing).toContain("Price");
    expect(missing).toContain("Team");
    expect(missing).toContain("Position Tag");
  });
});
