import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { renameTag } from "@/db/cards";

interface RenameTagBody {
  fromTag: string;
  toTag: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RenameTagBody;
  const { fromTag, toTag } = body;

  if (!fromTag?.trim() || !toTag?.trim()) {
    return NextResponse.json(
      { error: "Both fromTag and toTag are required" },
      { status: 400 },
    );
  }

  if (fromTag.trim() === toTag.trim()) {
    return NextResponse.json(
      { error: "Source and target tags must be different" },
      { status: 400 },
    );
  }

  const db = getDb();
  const updated = renameTag(db, fromTag.trim(), toTag.trim());

  return NextResponse.json({ updated });
}
