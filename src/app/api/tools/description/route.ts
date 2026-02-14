import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCardById } from "@/db/cards";
import type { Card } from "@/db/schema";

function generateDescription(selectedCards: Card[]): { title: string; description: string } {
  const sports = [...new Set(selectedCards.map((c) => c.sport))];
  const sportLabel = sports.length === 1 ? capitalize(sports[0]) : "Sports";
  const title = `${sportLabel} Card Lot - ${selectedCards.length} Cards`;

  const teams = [...new Set(selectedCards.map((c) => c.team).filter(Boolean))];
  const brands = [...new Set(selectedCards.map((c) => c.brand).filter(Boolean))];
  const years = selectedCards.map((c) => c.year).filter((y): y is number => y != null);
  const minYear = years.length > 0 ? Math.min(...years) : null;
  const maxYear = years.length > 0 ? Math.max(...years) : null;
  const yearRange = minYear && maxYear
    ? minYear === maxYear ? String(minYear) : `${minYear}-${maxYear}`
    : null;

  const lines: string[] = [];

  lines.push(`${sportLabel} card lot of ${selectedCards.length} cards for sale!`);
  lines.push("");

  if (yearRange) {
    lines.push(`Years: ${yearRange}`);
  }
  if (teams.length > 0) {
    lines.push(`Teams: ${teams.slice(0, 8).join(", ")}${teams.length > 8 ? ` + ${teams.length - 8} more` : ""}`);
  }
  if (brands.length > 0) {
    lines.push(`Brands: ${brands.join(", ")}`);
  }
  lines.push("");

  lines.push("Cards included:");
  for (const card of selectedCards) {
    const parts = [card.playerName];
    if (card.year) parts.push(String(card.year));
    if (card.brand) parts.push(card.brand);
    if (card.setName) parts.push(card.setName);
    if (card.condition) parts.push(`(${card.condition})`);
    lines.push(`- ${parts.join(" ")}`);
  }

  lines.push("");
  lines.push("Ships in top loaders / penny sleeves. See photos for condition.");
  lines.push("Feel free to message with any questions!");

  return { title, description: lines.join("\n") };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function POST(request: NextRequest) {
  const { cardIds } = await request.json() as { cardIds: string[] };

  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: "cardIds is required" }, { status: 400 });
  }

  const db = getDb();
  const selectedCards = cardIds
    .map((id) => getCardById(db, id))
    .filter((c): c is Card => c != null);

  if (selectedCards.length === 0) {
    return NextResponse.json({ error: "No valid cards found" }, { status: 404 });
  }

  const result = generateDescription(selectedCards);
  return NextResponse.json(result);
}
