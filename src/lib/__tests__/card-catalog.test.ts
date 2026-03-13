import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchCatalog, findMatchingPrice, findPriceInCatalog, clearCatalogCache, type CatalogCard } from "@/lib/card-catalog";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  clearCatalogCache();
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

// Hockey cards use season strings like "1994-95" instead of plain year numbers
const GILMOUR_1994_HOCKEY_RAW = {
  name: "Doug Gilmour",
  releaseYear: "1994-95",
  releaseName: "Topps Premier",
  setName: "Base Set",
  number: "225",
};

const GILMOUR_1997_HOCKEY_RAW = {
  name: "Doug Gilmour",
  releaseYear: "1997-98",
  releaseName: "Collector's Choice",
  setName: "You Crash the Game",
  number: "C13",
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

  it("parses hockey season year strings (e.g. '1994-95') as the starting year", async () => {
    mockFetch.mockResolvedValueOnce(
      mockPage([GILMOUR_1994_HOCKEY_RAW, GILMOUR_1997_HOCKEY_RAW]),
    );

    const result = await searchCatalog(
      { player: "Doug Gilmour", sport: "hockey" },
      "test-api-key",
    );

    expect(result).toHaveLength(2);
    expect(result![0].year).toBe(1994);
    expect(result![1].year).toBe(1997);
  });

  it("filters hockey cards by year range using the parsed starting year", async () => {
    mockFetch.mockResolvedValueOnce(
      mockPage([GILMOUR_1994_HOCKEY_RAW, GILMOUR_1997_HOCKEY_RAW]),
    );

    const result = await searchCatalog(
      { player: "Doug Gilmour", sport: "hockey", yearFrom: 1995, yearTo: 2000 },
      "test-api-key",
    );

    expect(result).toHaveLength(1);
    expect(result![0].year).toBe(1997);
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

describe("findPriceInCatalog", () => {
  const BASE_PARAMS = { year: 1985, brand: "Topps", cardNumber: "695" };

  it("returns { price } when match is on the first page", async () => {
    mockFetch.mockResolvedValueOnce(mockPage([HENDERSON_1985_RAW]));

    const result = await findPriceInCatalog(
      { player: "Rickey Henderson" },
      BASE_PARAMS,
      "test-api-key",
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    // HENDERSON_1985_RAW has no prices field, so rawPrice is undefined → null
    expect(result).toEqual({ price: null });
  });

  it("returns { price } when match is found on a later page", async () => {
    const page0Cards = Array.from({ length: 100 }, (_, i) => ({
      ...HENDERSON_1985_RAW,
      number: String(i + 1),
    }));
    const matchCard = { ...HENDERSON_1985_RAW, number: "695", prices: { raw: "12.50" } };

    mockFetch
      .mockResolvedValueOnce(mockPage(page0Cards, 200))
      .mockResolvedValueOnce(mockPage([matchCard], 200));

    const result = await findPriceInCatalog(
      { player: "Rickey Henderson" },
      BASE_PARAMS,
      "test-api-key",
    );

    expect(result).toEqual({ price: 12.50 });
  });

  it("returns { price: null } when card is not found on any page", async () => {
    mockFetch.mockResolvedValueOnce(mockPage([HENDERSON_1986_RAW]));

    const result = await findPriceInCatalog(
      { player: "Rickey Henderson" },
      BASE_PARAMS,
      "test-api-key",
    );

    expect(result).toEqual({ price: null });
  });

  it("returns null on API error on first page", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => "error" });

    const result = await findPriceInCatalog(
      { player: "Rickey Henderson" },
      BASE_PARAMS,
      "test-api-key",
    );

    expect(result).toBeNull();
  });
});

describe("findMatchingPrice", () => {
  const cards: CatalogCard[] = [
    { playerName: "Rickey Henderson", year: 1985, brand: "Topps", setName: "Base Set", cardNumber: "695", rawPrice: 12.50 },
    { playerName: "Rickey Henderson", year: 1985, brand: "Topps", setName: "Base Set", cardNumber: "696", rawPrice: 5.00 },
    { playerName: "Rickey Henderson", year: 1986, brand: "Topps", setName: "Base Set", cardNumber: "695", rawPrice: 8.00 },
    { playerName: "Rickey Henderson", year: 1985, brand: "Fleer", setName: "Base Set", cardNumber: "695", rawPrice: 3.00 },
    { playerName: "Rickey Henderson", year: 1985, brand: "Topps", setName: "Base Set", cardNumber: "100", rawPrice: undefined },
  ];

  it("returns price when year, brand, and cardNumber all match", () => {
    const result = findMatchingPrice(cards, { year: 1985, brand: "Topps", cardNumber: "695" });
    expect(result).toBe(12.50);
  });

  it("returns null when year does not match", () => {
    const result = findMatchingPrice(cards, { year: 1990, brand: "Topps", cardNumber: "695" });
    expect(result).toBeNull();
  });

  it("returns null when brand does not match", () => {
    const result = findMatchingPrice(cards, { year: 1985, brand: "Donruss", cardNumber: "695" });
    expect(result).toBeNull();
  });

  it("further filters by optional setName when provided", () => {
    const result = findMatchingPrice(cards, { year: 1985, brand: "Topps", setName: "Base Set", cardNumber: "695" });
    expect(result).toBe(12.50);
  });

  it("further filters by optional variant when provided", () => {
    const withVariant: CatalogCard[] = [
      { playerName: "X", year: 1985, brand: "Topps", cardNumber: "695", variant: "Foil", rawPrice: 20.00 },
      { playerName: "X", year: 1985, brand: "Topps", cardNumber: "695", variant: undefined, rawPrice: 5.00 },
    ];
    const result = findMatchingPrice(withVariant, { year: 1985, brand: "Topps", cardNumber: "695", variant: "Foil" });
    expect(result).toBe(20.00);
  });

  it("returns null when match has no rawPrice", () => {
    const result = findMatchingPrice(cards, { year: 1985, brand: "Topps", cardNumber: "100" });
    expect(result).toBeNull();
  });
});
