import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/cardsight/subscription/route";

vi.mock("@/lib/cardsight-subscription", () => ({
  fetchSubscription: vi.fn(),
}));

import { fetchSubscription } from "@/lib/cardsight-subscription";
const mockFetchSubscription = vi.mocked(fetchSubscription);

beforeEach(() => {
  vi.resetAllMocks();
  delete process.env.CARDSIGHT_API_KEY;
});

describe("GET /api/cardsight/subscription", () => {
  it("returns 503 when CARDSIGHT_API_KEY is not set", async () => {
    const response = await GET();
    expect(response.status).toBe(503);
  });

  it("returns subscription info when fetch succeeds", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    mockFetchSubscription.mockResolvedValueOnce({ callsRemaining: 120 });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ callsRemaining: 120 });
  });

  it("returns 502 when fetchSubscription returns null", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    mockFetchSubscription.mockResolvedValueOnce(null);

    const response = await GET();
    expect(response.status).toBe(502);
  });
});
