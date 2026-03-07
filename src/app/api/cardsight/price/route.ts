import { NextRequest, NextResponse } from "next/server";
import { searchCatalog, findMatchingPrice } from "@/lib/card-catalog";

export async function GET(request: NextRequest) {
  const apiKey = process.env.CARDSIGHT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CARDSIGHT_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const params = request.nextUrl.searchParams;
  const player = params.get("player");
  const yearRaw = params.get("year");
  const brand = params.get("brand");

  if (!player || !yearRaw || !brand) {
    return NextResponse.json(
      { error: "player, year, and brand are required" },
      { status: 400 },
    );
  }

  const year = Number(yearRaw);
  const setName = params.get("setName") ?? undefined;
  const cardNumber = params.get("cardNumber") ?? undefined;
  const variant = params.get("variant") ?? undefined;

  const catalog = await searchCatalog({ player }, apiKey);
  if (catalog === null) {
    return NextResponse.json(
      { error: "CardSight catalog search failed" },
      { status: 502 },
    );
  }

  const price = findMatchingPrice(catalog, { year, brand, setName, cardNumber, variant });
  return NextResponse.json({ price });
}
