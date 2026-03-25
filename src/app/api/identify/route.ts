import { NextRequest, NextResponse } from "next/server";
import { identifyCard, isCardSightDisabled, isIdentificationAvailable } from "@/lib/card-identifier";

export async function POST(request: NextRequest) {
  if (isCardSightDisabled()) {
    return NextResponse.json(
      { error: "CardSight API is temporarily disabled" },
      { status: 503 },
    );
  }

  if (!isIdentificationAvailable()) {
    return NextResponse.json(
      { error: "Card identification is not configured. Set CARDSIGHT_API_KEY in .env.local" },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const sport = formData.get("sport") as string | null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await identifyCard(buffer, sport ?? "baseball");

  if (!result) {
    return NextResponse.json(
      { error: "Could not identify card. Try manual entry." },
      { status: 422 },
    );
  }

  return NextResponse.json(result);
}
