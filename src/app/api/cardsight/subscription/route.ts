import { NextResponse } from "next/server";
import { fetchSubscription } from "@/lib/cardsight-subscription";

export async function GET() {
  const apiKey = process.env.CARDSIGHT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CARDSIGHT_API_KEY is not configured" },
      { status: 404 },
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
