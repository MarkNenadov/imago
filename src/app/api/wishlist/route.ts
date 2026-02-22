import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { createWishlistItem, listWishlistItems } from "@/db/wishlist";
import type { NewWishlistItem } from "@/db/schema";

export async function GET() {
  const db = getDb();
  const items = listWishlistItems(db);
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Support both a single item and an array (for bulk Fill Gaps inserts)
  const inputs: Omit<NewWishlistItem, "id">[] = Array.isArray(body) ? body : [body];

  const invalid = inputs.find((item) => !item.playerName?.trim());
  if (invalid !== undefined) {
    return NextResponse.json(
      { error: "playerName is required for all items" },
      { status: 400 },
    );
  }

  const created = inputs.map((item) =>
    createWishlistItem(db, { ...item, playerName: item.playerName.trim() }),
  );

  return NextResponse.json(Array.isArray(body) ? created : created[0], {
    status: 201,
  });
}
