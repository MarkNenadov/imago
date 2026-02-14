import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { generateImagePath, isAllowedExtension } from "@/lib/images";
import { getDb } from "@/db";
import { imageHashes } from "@/db/schema";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!isAllowedExtension(extension)) {
    return NextResponse.json(
      { error: "File type not allowed. Use jpg, jpeg, png, or webp." },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const hash = createHash("sha256").update(buffer).digest("hex");

  const db = getDb();
  const existing = db
    .select()
    .from(imageHashes)
    .where(eq(imageHashes.hash, hash))
    .get();

  if (existing) {
    return NextResponse.json(
      { error: "This image has already been uploaded.", path: existing.imagePath },
      { status: 409 },
    );
  }

  const imagePath = generateImagePath(extension);
  const fullPath = path.join(process.cwd(), "public", imagePath);

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);

  db.insert(imageHashes).values({ hash, imagePath }).run();

  return NextResponse.json({ path: imagePath }, { status: 201 });
}
