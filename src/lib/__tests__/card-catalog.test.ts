import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchCatalog, type CatalogCard } from "@/lib/card-catalog";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function mockPage(cards: CatalogCard[]) {
  return {
    ok: true,
    json: async () => ({ cards, total_count: cards.length, take: 100, skip: 0 }),
  };
}

// Raw API response shape (matches actual CardSight catalog response)
const HENDERSON_1985_RAW = {
  name: "Rickey Henderson",
  releaseYear: "1985",
  releaseName: "Topps",
  setName: "Base Set",
  number: "695",
};

const HENDERSON_1986_RAW = {
  name: "Rickey Henderson",
  releaseYear: "1986",
  releaseName: "Topps",
  setName: "Base Set",
  number: "500",
};

describe("searchCatalog", () => {
  it("returns empty array when API key is not set", async () => {
    const result = await searchCatalog(
      { player: "Rickey Henderson", yearFrom: 1985, yearTo: 1986 },
      undefined,
    );
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uses per-year strategy when year range is provided — one request per year", async () => {
    // 2-year range → 2 parallel fetch calls
    mockFetch
      .mockResolvedValueOnce(mockPage([HENDERSON_1985_RAW]))
      .mockResolvedValueOnce(mockPage([HENDERSON_1986_RAW]));

    const result = await searchCatalog(
      { player: "Rickey Henderson", yearFrom: 1985, yearTo: 1986 },
      "test-api-key",
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0].year).toBe(1985);
    expect(result[1].year).toBe(1986);
  });

  it("uses single-page strategy when no year range is provided", async () => {
    mockFetch.mockResolvedValueOnce(mockPage([HENDERSON_1985_RAW, HENDERSON_1986_RAW]));

    const result = await searchCatalog(
      { player: "Rickey Henderson" },
      "test-api-key",
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });

  it("returns empty array on API error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => "error" });

    const result = await searchCatalog(
      { player: "Rickey Henderson", yearFrom: 1985, yearTo: 1986 },
      "test-api-key",
    );

    expect(result).toEqual([]);
  });
});
