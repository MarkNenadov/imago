const CARDSIGHT_API_BASE = "https://api.cardsight.ai";

export interface SubscriptionInfo {
  callsRemaining: number;
}

function mapSubscription(raw: Record<string, unknown>): SubscriptionInfo {
  return {
    callsRemaining: typeof raw.calls_remaining === "number" ? raw.calls_remaining : 0,
  };
}

export async function fetchSubscription(
  apiKey: string | undefined,
): Promise<SubscriptionInfo | null> {
  if (!apiKey) return null;

  const response = await fetch(`${CARDSIGHT_API_BASE}/v1/subscription`, {
    headers: { "X-API-Key": apiKey },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[CardSight subscription] ${response.status}`, body);
    return null;
  }

  const raw = await response.json() as Record<string, unknown>;
  return mapSubscription(raw);
}
