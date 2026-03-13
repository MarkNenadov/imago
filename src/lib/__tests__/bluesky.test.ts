import { describe, it, expect } from "vitest";
import { buildPostText } from "@/lib/bluesky";
import type { Card } from "@/db/schema";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "1",
    playerName: "Ken Griffey Jr.",
    year: 1989,
    brand: "Upper Deck",
    setName: "Base Set",
    cardNumber: "1",
    team: "Seattle Mariners",
    sport: "baseball",
    variant: null,
    condition: null,
    purchasePrice: null,
    purchaseDate: null,
    purchaseSource: null,
    location: null,
    imageFront: "/uploads/front.jpg",
    imageBack: null,
    notes: null,
    tags: [],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

describe("buildPostText", () => {
  it("includes year, brand, playerName, and cardNumber on line 1", () => {
    const text = buildPostText(makeCard());
    expect(text.split("\n")[0]).toBe("1989 Upper Deck Ken Griffey Jr. #1");
  });

  it("includes setName on line 2 when present", () => {
    const text = buildPostText(makeCard());
    expect(text.split("\n")[1]).toBe("Base Set");
  });

  it("includes variant in parentheses on line 2", () => {
    const text = buildPostText(makeCard({ variant: "Foil" }));
    expect(text.split("\n")[1]).toBe("Base Set (Foil)");
  });

  it("omits line 2 when neither setName nor variant are present", () => {
    const text = buildPostText(makeCard({ setName: null, variant: null }));
    const lines = text.split("\n");
    expect(lines[1]).toBe("Baseball · Seattle Mariners");
  });

  it("shows variant alone on line 2 when setName is absent", () => {
    const text = buildPostText(makeCard({ setName: null, variant: "Refractor" }));
    expect(text.split("\n")[1]).toBe("(Refractor)");
  });

  it("capitalizes sport and includes team on line 3", () => {
    const text = buildPostText(makeCard());
    const lines = text.split("\n");
    expect(lines[2]).toBe("Baseball · Seattle Mariners");
  });

  it("omits team separator when team is absent", () => {
    const text = buildPostText(makeCard({ team: null }));
    const lines = text.split("\n");
    const sportLine = lines.find((l) => l.startsWith("Baseball"));
    expect(sportLine).toBe("Baseball");
  });

  it("includes sport, brand, and team hashtags on last line", () => {
    const text = buildPostText(makeCard());
    expect(text.split("\n").at(-1)).toBe(
      "#sportscards #baseball #upperdeck #seattlemariners",
    );
  });

  it("removes spaces from multi-word sport hashtag", () => {
    const text = buildPostText(makeCard({ sport: "ice hockey" }));
    expect(text.split("\n").at(-1)).toContain("#icehockey");
  });

  it("removes spaces and special chars from brand hashtag", () => {
    const text = buildPostText(makeCard({ brand: "O-Pee-Chee" }));
    expect(text.split("\n").at(-1)).toContain("#opeechee");
  });

  it("removes apostrophes and spaces from team hashtag", () => {
    const text = buildPostText(makeCard({ team: "Oakland A's" }));
    expect(text.split("\n").at(-1)).toContain("#oaklandas");
  });

  it("omits brand hashtag when brand is absent", () => {
    const text = buildPostText(makeCard({ brand: null }));
    expect(text.split("\n").at(-1)).not.toContain("#upperdeck");
  });

  it("omits team hashtag when team is absent", () => {
    const text = buildPostText(makeCard({ team: null }));
    expect(text.split("\n").at(-1)).not.toContain("#seattlemariners");
  });

  it("omits year when absent", () => {
    const text = buildPostText(makeCard({ year: null }));
    expect(text.split("\n")[0]).toBe("Upper Deck Ken Griffey Jr. #1");
  });

  it("omits brand when absent", () => {
    const text = buildPostText(makeCard({ brand: null }));
    expect(text.split("\n")[0]).toBe("1989 Ken Griffey Jr. #1");
  });

  it("omits cardNumber when absent", () => {
    const text = buildPostText(makeCard({ cardNumber: null }));
    expect(text.split("\n")[0]).toBe("1989 Upper Deck Ken Griffey Jr.");
  });
});
