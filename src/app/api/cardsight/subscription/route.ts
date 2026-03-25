import { NextResponse } from "next/server";
import { isCardSightDisabled } from "@/lib/card-identifier";
import { fetchSubscription } from "@/lib/cardsight-subscription";

export async function GET() {
  if (isCardSightDisabled()) {
    return NextResponse.json(
      { error: "CardSight API is temporarily disabled" },
      { status: 503 },
    );
  }

  const apiKey = process.env.CARDSIGHT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CARDSIGHT_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const info = await fetchSubscription(apiKey);
  if (!info) {
    return NextResponse.json(
      { error: "Failed to fetch subscription info from CardSight" },
      { status: 502 },
    );
  }

  return NextResponse.json(info);
}
