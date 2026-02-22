import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readFile } from "fs/promises";
import { createGrid } from "sharp-image-grid";
import { getDb } from "@/db";
import { getCardById } from "@/db/cards";
import type { Card } from "@/db/schema";

async function loadCardImage(imagePath: string): Promise<Buffer> {
  return readFile(join(process.cwd(), "public", imagePath));
}

export async function POST(request: NextRequest) {
  const { cardIds } = await request.json() as { cardIds: string[] };

  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: "cardIds is required" }, { status: 400 });
  }

  const db = getDb();
  const selectedCards = cardIds
    .map((id) => getCardById(db, id))
    .filter((c): c is Card => c != null && c.imageFront != null);

  if (selectedCards.length === 0) {
    return NextResponse.json(
      { error: "No cards with front images found" },
      { status: 400 },
    );
  }

  const imageBuffers = await Promise.all(
    selectedCards.map((c) => loadCardImage(c.imageFront!)),
  );

  const CARDS_PER_IMAGE = 6;
  const chunks: Buffer[][] = [];
  for (let i = 0; i < imageBuffers.length; i += CARDS_PER_IMAGE) {
    chunks.push(imageBuffers.slice(i, i + CARDS_PER_IMAGE));
  }

  const compositeBuffers = await Promise.all(
    chunks.map((chunk) =>
      createGrid(chunk, { cols: 2, cellWidth: 400, cellHeight: 560, gap: 12 }),
    ),
  );

  const base64Images = compositeBuffers.map((buf) =>
    `data:image/jpeg;base64,${buf.toString("base64")}`,
  );

  return NextResponse.json({ images: base64Images });
}
