import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSubscription } from "@/lib/cardsight-subscription";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("fetchSubscription", () => {
  it("returns null when API key is not set", async () => {
    const result = await fetchSubscription(undefined);
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns subscription info with calls remaining on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ calls: 100 }),
    });

    const result = await fetchSubscription("test-api-key");
    expect(result).toEqual({ callsRemaining: 650 }); // 750 - 100
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.cardsight.ai/v1/subscription",
      { headers: { "X-API-Key": "test-api-key" } },
    );
  });

  it("returns null on upstream API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const result = await fetchSubscription("test-api-key");
    expect(result).toBeNull();
  });
});
