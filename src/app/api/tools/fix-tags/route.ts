import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { listCards, updateCard } from "@/db/cards";

interface TagFix {
  cardId: string;
  playerName: string;
  year: number;
  addedTag: string;
}

function getDecadeTag(year: number): string | null {
  const decade = Math.floor(year / 10) * 10;
  if (decade >= 1960 && decade <= 1990) {
    return `${decade}s`;
  }
  return null;
}

export async function GET() {
  const db = getDb();
  const allCards = listCards(db);

  const fixes: TagFix[] = [];
  for (const card of allCards) {
    if (!card.year) continue;
    const decadeTag = getDecadeTag(card.year);
    if (!decadeTag) continue;

    const tags = (card.tags as string[]) ?? [];
    if (!tags.includes(decadeTag)) {
      fixes.push({
        cardId: card.id,
        playerName: card.playerName,
        year: card.year,
        addedTag: decadeTag,
      });
    }
  }

  return NextResponse.json({ fixes });
}

export async function POST() {
  const db = getDb();
  const allCards = listCards(db);

  const fixes: TagFix[] = [];
  for (const card of allCards) {
    if (!card.year) continue;
    const decadeTag = getDecadeTag(card.year);
    if (!decadeTag) continue;

    const tags = (card.tags as string[]) ?? [];
    if (!tags.includes(decadeTag)) {
      const updatedTags = [...tags, decadeTag];
      updateCard(db, card.id, { tags: updatedTags });
      fixes.push({
        cardId: card.id,
        playerName: card.playerName,
        year: card.year,
        addedTag: decadeTag,
      });
    }
  }

  return NextResponse.json({ fixed: fixes.length, fixes });
}
