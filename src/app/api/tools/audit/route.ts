import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { listCards } from "@/db/cards";
import { getMissingFields } from "@/lib/audit";

import type { CardPlayer } from "@/db/schema";

interface IncompleteCard {
  id: string;
  playerName: string;
  missing: string[];
}

export async function GET() {
  const db = getDb();
  const allCards = listCards(db);

  const incomplete: IncompleteCard[] = allCards
    .map((card) => ({
      id: card.id,
      playerName: (card.players as CardPlayer[])[0]?.name ?? "",
      missing: getMissingFields(card),
    }))
    .filter(({ missing }) => missing.length > 0);

  return NextResponse.json({
    totalCards: allCards.length,
    incompleteCount: incomplete.length,
    cards: incomplete,
  });
}
