import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import sharp from "sharp";
import { AtpAgent, RichText } from "@atproto/api";
import { getDb } from "@/db";
import { getCardById } from "@/db/cards";

// Bluesky's maximum blob size in bytes
const BSKY_MAX_BYTES = 976_560;

// Resize and compress to JPEG, reducing quality until it fits under the limit.
// Applies EXIF auto-rotation then the user's explicit rotation before resizing.
// Starting at quality 90 and stepping down by 10 gives up to 7 attempts.
async function compressForBluesky(imageBuffer: Buffer, rotationDeg: number): Promise<Buffer> {
  for (let quality = 90; quality >= 30; quality -= 10) {
    const compressed = await sharp(imageBuffer)
      .rotate()             // auto-rotate based on EXIF orientation
      .rotate(rotationDeg)  // apply user rotation (0 is a no-op)
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    if (compressed.length <= BSKY_MAX_BYTES) {
      return compressed;
    }
  }
  throw new Error("Image could not be compressed small enough to upload");
}

export async function POST(request: NextRequest) {
  const handle = process.env.BSKY_HANDLE;
  const appPassword = process.env.BSKY_APP_PASSWORD;

  if (!handle || !appPassword) {
    return NextResponse.json(
      { error: "Bluesky credentials not configured" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const { cardId, text, rotation } = body ?? {};

  if (!cardId || typeof cardId !== "string") {
    return NextResponse.json({ error: "cardId is required" }, { status: 400 });
  }
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const db = getDb();
  const card = getCardById(db, cardId);

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  if (!card.imageFront) {
    return NextResponse.json(
      { error: "Card has no front image" },
      { status: 422 },
    );
  }

  try {
    const agent = new AtpAgent({ service: "https://bsky.social" });
    await agent.login({ identifier: handle, password: appPassword });

    const imagePath = path.join(process.cwd(), "public", card.imageFront);
    const rawBuffer = await readFile(imagePath);
    const rotationDeg = typeof rotation === "number" ? rotation : 0;
    const imageBuffer = await compressForBluesky(rawBuffer, rotationDeg);

    const { data: blobData } = await agent.uploadBlob(imageBuffer, {
      encoding: "image/jpeg",
    });

    const rt = new RichText({ text });
    await rt.detectFacets(agent);

    const { uri } = await agent.post({
      text: rt.text,
      facets: rt.facets,
      embed: {
        $type: "app.bsky.embed.images",
        images: [{ image: blobData.blob, alt: `${card.playerName} card` }],
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, uri });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Post failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
