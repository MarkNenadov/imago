import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { listCards } from "@/db/cards";
import type { CardPlayer } from "@/db/schema";

const CSV_COLUMNS = [
  "Player Name",
  "Year",
  "Brand",
  "Set",
  "Card Number",
  "Team",
  "Sport",
  "Condition",
  "Purchase Price",
  "Purchase Date",
  "Purchase Source",
  "Location",
  "Tags",
  "Notes",
] as const;

function escapeCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const db = getDb();
  const allCards = listCards(db);

  const rows = allCards.map((card) => {
    const players = (card.players as CardPlayer[]) ?? [];
    const playerName = players.map((p) => p.name).join(" / ");
    const teams = [...new Set(players.map((p) => p.team).filter(Boolean))].join(" / ");
    const tags = Array.isArray(card.tags) ? (card.tags as string[]).join("; ") : "";
    return [
      playerName,
      card.year != null ? String(card.year) : "",
      card.brand ?? "",
      card.setName ?? "",
      card.cardNumber ?? "",
      teams,
      card.sport,
      card.condition ?? "",
      card.purchasePrice != null ? card.purchasePrice.toFixed(2) : "",
      card.purchaseDate ?? "",
      card.purchaseSource ?? "",
      card.location ?? "",
      tags,
      card.notes ?? "",
    ].map(escapeCell).join(",");
  });

  const csv = [CSV_COLUMNS.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="imago-collection.csv"',
    },
  });
}
