import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { listCards, getCardById, updateCard } from "@/db/cards";
import type { Card } from "@/db/schema";

const EDITABLE_FIELDS = [
  "location",
  "purchasePrice",
  "condition",
  "purchaseDate",
  "purchaseSource",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

function isEditableField(name: string): name is EditableField {
  return (EDITABLE_FIELDS as readonly string[]).includes(name);
}

function cardIsMissingField(card: Card, fieldName: EditableField): boolean {
  const value = card[fieldName];
  return value == null || value === "";
}

const EXCLUDED_POSITION_TAGS: Record<string, string[]> = {
  batters: ["pitchers", "pitcher", "manager", "managers"],
  batter: ["pitchers", "pitcher", "manager", "managers"],
  pitchers: ["batters", "batter", "manager", "managers"],
  pitcher: ["batters", "batter", "manager", "managers"],
};

function cardIsMissingTag(card: Card, tagName: string): boolean {
  const tags = (card.tags as string[]) ?? [];
  if (tags.includes(tagName)) return false;
  const excluded = EXCLUDED_POSITION_TAGS[tagName.toLowerCase()];
  if (excluded && tags.some((t) => excluded.includes(t.toLowerCase()))) return false;
  return true;
}

function pickCardSummary(card: Card) {
  return {
    id: card.id,
    playerName: card.playerName,
    year: card.year,
    brand: card.brand,
    team: card.team,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const name = searchParams.get("name");

  if (!type || !name) {
    return NextResponse.json(
      { error: "Missing type or name parameter" },
      { status: 400 },
    );
  }

  if (type !== "tag" && type !== "field") {
    return NextResponse.json(
      { error: "type must be 'tag' or 'field'" },
      { status: 400 },
    );
  }

  if (type === "field" && !isEditableField(name)) {
    return NextResponse.json(
      { error: `Invalid field name: ${name}` },
      { status: 400 },
    );
  }

  const db = getDb();
  const allCards = listCards(db);

  const missing =
    type === "tag"
      ? allCards.filter((c) => cardIsMissingTag(c, name))
      : allCards.filter((c) => cardIsMissingField(c, name as EditableField));

  return NextResponse.json({
    cards: missing.map(pickCardSummary),
  });
}

interface BulkEditBody {
  cardIds: string[];
  type: "tag" | "field";
  name: string;
  value: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as BulkEditBody;
  const { cardIds, type, name, value } = body;

  if (!cardIds?.length || !type || !name || value == null) {
    return NextResponse.json(
      { error: "Missing required fields: cardIds, type, name, value" },
      { status: 400 },
    );
  }

  if (type === "field" && !isEditableField(name)) {
    return NextResponse.json(
      { error: `Invalid field name: ${name}` },
      { status: 400 },
    );
  }

  const db = getDb();
  let updated = 0;

  for (const cardId of cardIds) {
    const card = getCardById(db, cardId);
    if (!card) continue;

    if (type === "tag") {
      const existingTags = (card.tags as string[]) ?? [];
      if (!existingTags.includes(value)) {
        updateCard(db, cardId, { tags: [...existingTags, value] });
        updated++;
      }
    } else {
      const fieldName = name as EditableField;
      let parsedValue: string | number = value.trim();

      if (fieldName === "purchasePrice") {
        parsedValue = parseFloat(parsedValue);
        if (isNaN(parsedValue)) {
          return NextResponse.json(
            { error: `Invalid price value: ${value}` },
            { status: 400 },
          );
        }
      }

      updateCard(db, cardId, { [fieldName]: parsedValue });
      updated++;
    }
  }

  return NextResponse.json({ updated });
}
