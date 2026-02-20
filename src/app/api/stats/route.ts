import { NextRequest, NextResponse } from "next/server";
import { statSync } from "fs";
import path from "path";
import { getDb } from "@/db";
import { cards } from "@/db/schema";
import { getCollectionStats, getFilterOptions } from "@/db/stats";

function computeImageStorageMb(db: ReturnType<typeof getDb>): number {
  const rows = db.select({ imageFront: cards.imageFront, imageBack: cards.imageBack }).from(cards).all();
  const publicDir = path.join(process.cwd(), "public");
  let totalBytes = 0;
  for (const row of rows) {
    for (const imagePath of [row.imageFront, row.imageBack]) {
      if (!imagePath) continue;
      try {
        const { size } = statSync(path.join(publicDir, imagePath));
        totalBytes += size;
      } catch {
        // File missing — skip
      }
    }
  }
  return totalBytes / (1024 * 1024);
}

export async function GET(request: NextRequest) {
  const db = getDb();
  const include = request.nextUrl.searchParams.get("include");
  const imageStorageMb = computeImageStorageMb(db);

  if (include === "filterOptions") {
    const stats = getCollectionStats(db);
    const filterOptions = getFilterOptions(db);
    return NextResponse.json({ ...stats, imageStorageMb, filterOptions });
  }

  const stats = getCollectionStats(db);
  return NextResponse.json({ ...stats, imageStorageMb });
}
