import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { searchCatalog } from "@/lib/card-catalog";
import { filterCatalogGaps } from "./filter";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const player = params.get("player");

  if (!player?.trim()) {
    return NextResponse.json({ error: "player is required" }, { status: 400 });
  }

  const yearFrom = params.has("yearFrom") ? Number(params.get("yearFrom")) : undefined;
  const yearTo = params.has("yearTo") ? Number(params.get("yearTo")) : undefined;
  const sport = params.get("sport") ?? "baseball";

  const apiKey = process.env.CARDSIGHT_API_KEY;
  const catalog = await searchCatalog({ player, yearFrom, yearTo, sport }, apiKey);

  const db = getDb();
  const gaps = filterCatalogGaps(db, catalog);

  return NextResponse.json(gaps);
}
