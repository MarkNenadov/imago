import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateImagePath, isAllowedExtension } from "@/lib/images";

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

  const imagePath = generateImagePath(extension);
  const fullPath = path.join(process.cwd(), "public", imagePath);

  await mkdir(path.dirname(fullPath), { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(fullPath, Buffer.from(bytes));

  return NextResponse.json({ path: imagePath }, { status: 201 });
}
