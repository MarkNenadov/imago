import { describe, it, expect, vi } from "vitest";
import { searchCatalog, type CatalogCard } from "@/lib/card-catalog";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const MOCK_CARDS: CatalogCard[] = [
  { playerName: "Rickey Henderson", year: 1982, brand: "Topps", setName: "Topps", cardNumber: "610" },
  { playerName: "Rickey Henderson", year: 1986, brand: "Topps", setName: "Topps", cardNumber: "500" },
];

describe("searchCatalog", () => {
  it("returns empty array when API key is not set", async () => {
    const result = await searchCatalog(
      { player: "Rickey Henderson", yearFrom: 1982, yearTo: 1988, sport: "baseball" },
      undefined,
    );
    expect(result).toEqual([]);
  });

  it("returns mapped cards from CardSight response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, cards: MOCK_CARDS }),
    });

    const result = await searchCatalog(
      { player: "Rickey Henderson", yearFrom: 1982, yearTo: 1988, sport: "baseball" },
      "test-api-key",
    );

    expect(result).toHaveLength(2);
    expect(result[0].playerName).toBe("Rickey Henderson");
    expect(result[0].year).toBe(1982);
  });

  it("returns empty array on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "error" });

    const result = await searchCatalog(
      { player: "Rickey Henderson", yearFrom: 1982, yearTo: 1988, sport: "baseball" },
      "test-api-key",
    );

    expect(result).toEqual([]);
  });
});
