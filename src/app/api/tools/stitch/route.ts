import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { writeFile, readFile } from "fs/promises";
import sharp from "sharp";
import { v4 as uuid } from "uuid";
import { getDb } from "@/db";
import { getCardById } from "@/db/cards";
import type { Card } from "@/db/schema";

const COLS = 2;
const ROWS = 3;
const CARDS_PER_IMAGE = COLS * ROWS;
const CELL_WIDTH = 400;
const CELL_HEIGHT = 560;
const GAP = 12;
const CANVAS_WIDTH = COLS * CELL_WIDTH + (COLS + 1) * GAP;
const CANVAS_HEIGHT = ROWS * CELL_HEIGHT + (ROWS + 1) * GAP;

async function loadCardImage(imagePath: string): Promise<Buffer> {
  const filePath = join(process.cwd(), "public", imagePath);
  return readFile(filePath);
}

async function createComposite(imageBuffers: Buffer[]): Promise<Buffer> {
  const composites = await Promise.all(
    imageBuffers.map(async (buf, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const resized = await sharp(buf)
        .resize(CELL_WIDTH, CELL_HEIGHT, { fit: "contain", background: { r: 245, g: 245, b: 245 } })
        .toBuffer();
      return {
        input: resized,
        left: GAP + col * (CELL_WIDTH + GAP),
        top: GAP + row * (CELL_HEIGHT + GAP),
      };
    }),
  );

  return sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toBuffer();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
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

  const chunks = chunk(imageBuffers, CARDS_PER_IMAGE);
  const outputPaths: string[] = [];

  for (const group of chunks) {
    const composite = await createComposite(group);
    const filename = `lot-${uuid()}.jpg`;
    const outputPath = join(process.cwd(), "public", "uploads", filename);
    await writeFile(outputPath, composite);
    outputPaths.push(`/uploads/${filename}`);
  }

  return NextResponse.json({ images: outputPaths });
}
