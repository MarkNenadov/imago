import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { renameLocation } from "@/db/cards";

interface RenameLocationBody {
  fromLocation: string;
  toLocation: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RenameLocationBody;
  const { fromLocation, toLocation } = body;

  if (!fromLocation?.trim() || !toLocation?.trim()) {
    return NextResponse.json(
      { error: "Both fromLocation and toLocation are required" },
      { status: 400 },
    );
  }

  if (fromLocation.trim() === toLocation.trim()) {
    return NextResponse.json(
      { error: "Source and target locations must be different" },
      { status: 400 },
    );
  }

  const db = getDb();
  const updated = renameLocation(db, fromLocation.trim(), toLocation.trim());

  return NextResponse.json({ updated });
}
