import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { listCards, updateCard } from "@/db/cards";
import { isHallOfFamer, normalizePlayerName } from "@/lib/hall-of-fame";

interface TagFix {
  cardId: string;
  playerName: string;
  addedTag: string;
}

interface NameFix {
  cardId: string;
  oldName: string;
  newName: string;
}

function getDecadeTag(year: number): string | null {
  const decade = Math.floor(year / 10) * 10;
  if (decade >= 1960 && decade <= 1990) {
    return `${decade}s`;
  }
  return null;
}

function findMissingTags(playerName: string, year: number | null, tags: string[]): string[] {
  const missing: string[] = [];

  if (year) {
    const decadeTag = getDecadeTag(year);
    if (decadeTag && !tags.includes(decadeTag)) {
      missing.push(decadeTag);
    }
  }

  if (isHallOfFamer(playerName) && !tags.includes("HOF")) {
    missing.push("HOF");
  }

  return missing;
}

export async function GET() {
  const db = getDb();
  const allCards = listCards(db);

  const tagFixes: TagFix[] = [];
  const nameFixes: NameFix[] = [];
  for (const card of allCards) {
    const normalized = normalizePlayerName(card.playerName);
    if (normalized !== card.playerName) {
      nameFixes.push({ cardId: card.id, oldName: card.playerName, newName: normalized });
    }
    const tags = (card.tags as string[]) ?? [];
    const missing = findMissingTags(normalized, card.year, tags);
    for (const tag of missing) {
      tagFixes.push({ cardId: card.id, playerName: normalized, addedTag: tag });
    }
  }

  return NextResponse.json({ tagFixes, nameFixes });
}

export async function POST() {
  const db = getDb();
  const allCards = listCards(db);

  const tagFixes: TagFix[] = [];
  const nameFixes: NameFix[] = [];
  for (const card of allCards) {
    const normalized = normalizePlayerName(card.playerName);
    if (normalized !== card.playerName) {
      updateCard(db, card.id, { playerName: normalized });
      nameFixes.push({ cardId: card.id, oldName: card.playerName, newName: normalized });
    }
    const tags = (card.tags as string[]) ?? [];
    const missing = findMissingTags(normalized, card.year, tags);
    if (missing.length > 0) {
      const updatedTags = [...tags, ...missing];
      updateCard(db, card.id, { tags: updatedTags });
      for (const tag of missing) {
        tagFixes.push({ cardId: card.id, playerName: normalized, addedTag: tag });
      }
    }
  }

  return NextResponse.json({
    fixedNames: nameFixes.length,
    fixedTags: tagFixes.length,
    nameFixes,
    tagFixes,
  });
}
