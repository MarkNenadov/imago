import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { createCard, listCards, searchCards } from "@/db/cards";
import { isHallOfFamer } from "@/lib/hall-of-fame";

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = request.nextUrl.searchParams;

  const query = params.get("q");
  if (query) {
    const results = searchCards(db, query);
    return NextResponse.json(results);
  }

  const filters = {
    sport: params.get("sport") ?? undefined,
    location: params.get("location") ?? undefined,
    brand: params.get("brand") ?? undefined,
    team: params.get("team") ?? undefined,
    year: params.has("year") ? Number(params.get("year")) : undefined,
    tag: params.get("tag") ?? undefined,
    sortBy: (params.get("sortBy") as keyof ReturnType<typeof listCards>[number]) ?? undefined,
    sortOrder: (params.get("sortOrder") as "asc" | "desc") ?? undefined,
  };

  const cards = listCards(db, filters);
  return NextResponse.json(cards);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  if (!body.playerName?.trim()) {
    return NextResponse.json(
      { error: "playerName is required" },
      { status: 400 },
    );
  }

  const tags: string[] = Array.isArray(body.tags) ? [...body.tags] : [];
  if (body.year) {
    const decade = Math.floor(body.year / 10) * 10;
    const decadeTag = `${decade}s`;
    if (decade >= 1960 && decade <= 1990 && !tags.includes(decadeTag)) {
      tags.push(decadeTag);
    }
  }

  if (isHallOfFamer(body.playerName) && !tags.includes("HOF")) {
    tags.push("HOF");
  }

  const card = createCard(db, { ...body, tags });
  return NextResponse.json(card, { status: 201 });
}
