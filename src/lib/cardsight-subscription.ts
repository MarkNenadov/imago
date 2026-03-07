const CARDSIGHT_API_BASE = "https://api.cardsight.ai";

export interface SubscriptionInfo {
  callsRemaining: number;
}

const MONTHLY_QUOTA = 750;

function mapSubscription(raw: Record<string, unknown>): SubscriptionInfo {
  const callsUsed = typeof raw.calls === "number" ? raw.calls : 0;
  return {
    callsRemaining: MONTHLY_QUOTA - callsUsed,
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
