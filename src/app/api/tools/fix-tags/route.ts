import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { listCards, updateCard } from "@/db/cards";
import type { CardPlayer } from "@/db/schema";
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
    const players = (card.players as CardPlayer[]) ?? [];
    const updatedPlayers = players.map((p) => ({ ...p, name: normalizePlayerName(p.name) }));

    for (let i = 0; i < players.length; i++) {
      if (updatedPlayers[i].name !== players[i].name) {
        nameFixes.push({ cardId: card.id, oldName: players[i].name, newName: updatedPlayers[i].name });
      }
    }

    const tags = (card.tags as string[]) ?? [];
    for (const player of updatedPlayers) {
      const missing = findMissingTags(player.name, card.year, tags);
      for (const tag of missing) {
        tagFixes.push({ cardId: card.id, playerName: player.name, addedTag: tag });
      }
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
    const players = (card.players as CardPlayer[]) ?? [];
    const updatedPlayers = players.map((p) => ({ ...p, name: normalizePlayerName(p.name) }));

    let nameChanged = false;
    for (let i = 0; i < players.length; i++) {
      if (updatedPlayers[i].name !== players[i].name) {
        nameFixes.push({ cardId: card.id, oldName: players[i].name, newName: updatedPlayers[i].name });
        nameChanged = true;
      }
    }
    if (nameChanged) {
      updateCard(db, card.id, { players: updatedPlayers });
    }

    const tags = (card.tags as string[]) ?? [];
    const allMissing: string[] = [];
    for (const player of updatedPlayers) {
      const missing = findMissingTags(player.name, card.year, tags);
      for (const tag of missing) {
        if (!allMissing.includes(tag)) allMissing.push(tag);
        tagFixes.push({ cardId: card.id, playerName: player.name, addedTag: tag });
      }
    }
    if (allMissing.length > 0) {
      updateCard(db, card.id, { tags: [...tags, ...allMissing] });
    }
  }

  return NextResponse.json({
    fixedNames: nameFixes.length,
    fixedTags: tagFixes.length,
    nameFixes,
    tagFixes,
  });
}
