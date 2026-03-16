import type { Card, CardPlayer } from "@/db/schema";

export interface DuplicateGroup {
  playerName: string;
  year: number | null;
  brand: string | null;
  setName: string | null;
  cards: Card[];
}

export function groupDuplicateCards(cards: Card[]): DuplicateGroup[] {
  const groups = new Map<string, Card[]>();

  for (const card of cards) {
    const primaryName = (card.players as CardPlayer[])[0]?.name ?? "";
    const key = [
      primaryName.toLowerCase(),
      card.year ?? "",
      (card.brand ?? "").toLowerCase(),
      (card.setName ?? "").toLowerCase(),
    ].join("|");

    const existing = groups.get(key);
    if (existing) {
      existing.push(card);
    } else {
      groups.set(key, [card]);
    }
  }

  const duplicates: DuplicateGroup[] = [];
  for (const cards of groups.values()) {
    if (cards.length >= 2) {
      const first = cards[0];
      duplicates.push({
        playerName: (first.players as CardPlayer[])[0]?.name ?? "",
        year: first.year,
        brand: first.brand,
        setName: first.setName,
        cards,
      });
    }
  }

  return duplicates;
}
