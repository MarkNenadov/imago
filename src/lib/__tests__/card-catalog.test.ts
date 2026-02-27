import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchCatalog } from "@/lib/card-catalog";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

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

function mockPage(cards: unknown[], totalCount?: number) {
  return {
    ok: true,
    json: async () => ({
      cards,
      total_count: totalCount ?? cards.length,
      take: 100,
      skip: 0,
    }),
  };
}

describe("searchCatalog", () => {
  it("returns empty array when API key is not set", async () => {
    const result = await searchCatalog(
      { player: "Rickey Henderson", yearFrom: 1985, yearTo: 1986 },
      undefined,
    );
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns results from a single page when all fit", async () => {
    mockFetch.mockResolvedValueOnce(mockPage([HENDERSON_1985_RAW, HENDERSON_1986_RAW]));

    const result = await searchCatalog(
      { player: "Rickey Henderson" },
      "test-api-key",
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });

  it("paginates through all pages when total_count exceeds page size", async () => {
    const firstPageCards = Array.from({ length: 100 }, (_, i) => ({
      ...HENDERSON_1985_RAW,
      number: String(i + 1),
    }));
    const secondPageCards = Array.from({ length: 50 }, (_, i) => ({
      ...HENDERSON_1985_RAW,
      number: String(i + 101),
    }));

    mockFetch
      .mockResolvedValueOnce(mockPage(firstPageCards, 150))
      .mockResolvedValueOnce(mockPage(secondPageCards, 150));

    const result = await searchCatalog(
      { player: "Rickey Henderson" },
      "test-api-key",
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(150);
  });

  it("filters results by year range across all pages", async () => {
    mockFetch.mockResolvedValueOnce(
      mockPage([HENDERSON_1985_RAW, HENDERSON_1986_RAW]),
    );

    const result = await searchCatalog(
      { player: "Rickey Henderson", yearFrom: 1985, yearTo: 1985 },
      "test-api-key",
    );

    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(1985);
  });

  it("returns null on API error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => "error" });

    const result = await searchCatalog(
      { player: "Rickey Henderson", yearFrom: 1985, yearTo: 1986 },
      "test-api-key",
    );

    expect(result).toBeNull();
  });
});
