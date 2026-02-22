import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { deleteWishlistItem } from "@/db/wishlist";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const db = getDb();
  const deleted = deleteWishlistItem(db, id);

  if (!deleted) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
