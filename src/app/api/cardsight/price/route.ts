import { NextRequest, NextResponse } from "next/server";
import { findPriceInCatalog } from "@/lib/card-catalog";

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
  if (!Number.isInteger(year)) {
    return NextResponse.json(
      { error: "year must be a valid integer" },
      { status: 400 },
    );
  }

  const setName = params.get("setName") ?? undefined;
  const cardNumber = params.get("cardNumber") ?? undefined;
  const variant = params.get("variant") ?? undefined;

  const result = await findPriceInCatalog(
    { player },
    { year, brand, setName, cardNumber, variant },
    apiKey,
  );

  if (result === null) {
    return NextResponse.json(
      { error: "CardSight catalog search failed" },
      { status: 502 },
    );
  }

  return NextResponse.json(result);
}
