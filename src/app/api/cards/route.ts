import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { createCard, listCards, listCardsPaginated, searchCards } from "@/db/cards";
import { imageHashes } from "@/db/schema";
import { isHallOfFamer, normalizePlayerName } from "@/lib/hall-of-fame";

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
    setName: params.get("setName") ?? undefined,
    sortBy: (params.get("sortBy") as keyof ReturnType<typeof listCards>[number]) ?? undefined,
    sortOrder: (params.get("sortOrder") as "asc" | "desc") ?? undefined,
    limit: params.has("limit") ? Number(params.get("limit")) : undefined,
    offset: params.has("offset") ? Number(params.get("offset")) : undefined,
  };

  if (filters.limit) {
    const result = listCardsPaginated(db, filters);
    return NextResponse.json(result);
  }

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

  const playerName = normalizePlayerName(body.playerName);
  if (body.location) body.location = body.location.trim();

  const tags: string[] = Array.isArray(body.tags) ? [...body.tags] : [];
  if (body.year) {
    const decade = Math.floor(body.year / 10) * 10;
    const decadeTag = `${decade}s`;
    if (decade >= 1960 && decade <= 1990 && !tags.includes(decadeTag)) {
      tags.push(decadeTag);
    }
  }

  if (isHallOfFamer(playerName) && !tags.includes("HOF")) {
    tags.push("HOF");
  }

  const card = createCard(db, { ...body, playerName, tags });

  const hashes: { hash: string; imagePath: string }[] = Array.isArray(body.imageHashes)
    ? body.imageHashes
    : [];
  for (const { hash, imagePath } of hashes) {
    db.insert(imageHashes)
      .values({ hash, imagePath })
      .onConflictDoNothing()
      .run();
  }

  return NextResponse.json(card, { status: 201 });
}
