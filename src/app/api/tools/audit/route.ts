import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { listCards } from "@/db/cards";

interface IncompleteCard {
  id: string;
  playerName: string;
  missing: string[];
}

const IMPORTANT_FIELDS = [
  { key: "purchasePrice", label: "Price" },
  { key: "purchaseDate", label: "Purchase Date" },
  { key: "team", label: "Team" },
  { key: "imageFront", label: "Front Image" },
] as const;

const POSITION_TAGS = ["batter", "batters", "pitcher", "pitchers", "manager", "managers"];

export async function GET() {
  const db = getDb();
  const allCards = listCards(db);

  const incomplete: IncompleteCard[] = [];
  for (const card of allCards) {
    const missing: string[] = [];
    for (const { key, label } of IMPORTANT_FIELDS) {
      const value = card[key];
      if (value == null || value === "") {
        missing.push(label);
      }
    }

    const tags = (card.tags as string[]) ?? [];
    const hasPositionTag = tags.some((t) => POSITION_TAGS.includes(t.toLowerCase()));
    if (!hasPositionTag) {
      missing.push("Position Tag");
    }
    if (missing.length > 0) {
      incomplete.push({
        id: card.id,
        playerName: card.playerName,
        missing,
      });
    }
  }

  return NextResponse.json({
    totalCards: allCards.length,
    incompleteCount: incomplete.length,
    cards: incomplete,
  });
}
