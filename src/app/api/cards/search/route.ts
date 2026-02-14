import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { searchReferenceCards } from "@/db/reference";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const db = getDb();
  const results = searchReferenceCards(db, query);
  return NextResponse.json(results);
}
