import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCollectionStats, getFilterOptions } from "@/db/stats";

export async function GET(request: NextRequest) {
  const db = getDb();
  const include = request.nextUrl.searchParams.get("include");

  if (include === "filterOptions") {
    const stats = getCollectionStats(db);
    const filterOptions = getFilterOptions(db);
    return NextResponse.json({ ...stats, filterOptions });
  }

  const stats = getCollectionStats(db);
  return NextResponse.json(stats);
}
