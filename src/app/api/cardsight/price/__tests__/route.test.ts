import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/cardsight/price/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/card-catalog", () => ({
  findPriceInCatalog: vi.fn(),
}));

import { findPriceInCatalog } from "@/lib/card-catalog";
const mockFindPriceInCatalog = vi.mocked(findPriceInCatalog);

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/cardsight/price");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

beforeEach(() => {
  vi.resetAllMocks();
  delete process.env.CARDSIGHT_API_KEY;
});

describe("GET /api/cardsight/price", () => {
  it("returns 503 when CARDSIGHT_API_KEY is not set", async () => {
    const req = makeRequest({ player: "Rickey Henderson", year: "1985", brand: "Topps" });
    const res = await GET(req);
    expect(res.status).toBe(503);
  });

  it("returns 400 when player is missing", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    const req = makeRequest({ year: "1985", brand: "Topps" });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when year is missing", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    const req = makeRequest({ player: "Rickey Henderson", brand: "Topps" });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when brand is missing", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    const req = makeRequest({ player: "Rickey Henderson", year: "1985" });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when year is not a valid integer", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    const req = makeRequest({ player: "Rickey Henderson", year: "abc", brand: "Topps" });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns { price: number } when a match is found", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    mockFindPriceInCatalog.mockResolvedValueOnce({ price: 12.50 });

    const req = makeRequest({ player: "Rickey Henderson", year: "1985", brand: "Topps" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ price: 12.50 });
  });

  it("returns { price: null } when no match is found", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    mockFindPriceInCatalog.mockResolvedValueOnce({ price: null });

    const req = makeRequest({ player: "Rickey Henderson", year: "1985", brand: "Topps" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ price: null });
  });

  it("returns 502 when findPriceInCatalog fails", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    mockFindPriceInCatalog.mockResolvedValueOnce(null);

    const req = makeRequest({ player: "Rickey Henderson", year: "1985", brand: "Topps" });
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("passes optional params to findPriceInCatalog", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    mockFindPriceInCatalog.mockResolvedValueOnce({ price: 5.00 });

    const req = makeRequest({
      player: "Rickey Henderson",
      year: "1985",
      brand: "Topps",
      setName: "Base Set",
      cardNumber: "695",
      variant: "Foil",
    });
    await GET(req);

    expect(mockFindPriceInCatalog).toHaveBeenCalledWith(
      { player: "Rickey Henderson" },
      { year: 1985, brand: "Topps", setName: "Base Set", cardNumber: "695", variant: "Foil" },
      "test-key",
    );
  });
});
