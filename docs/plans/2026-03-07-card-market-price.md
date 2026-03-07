# Card Market Price Lookup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an on-demand market price lookup button to the card detail page that fetches live price data from the CardSight API without persisting it.

**Architecture:** A new API route (`GET /api/cardsight/price`) calls `searchCatalog` (existing lib) with the player name, then filters results using a new pure matching function. The card detail page adds ephemeral UI state for the price, displaying it alongside the purchase price.

**Tech Stack:** Next.js App Router API routes, TypeScript, Vitest, React, TailwindCSS, `bun` as package manager.

---

### Task 1: Extract `findMatchingPrice` helper

**Files:**
- Modify: `src/lib/card-catalog.ts`
- Create: `src/lib/__tests__/card-catalog.test.ts` (add new describe block at the bottom)

This is a pure function — test it in isolation before wiring it to the route.

**Step 1: Add failing tests for `findMatchingPrice`**

Open `src/lib/__tests__/card-catalog.test.ts` and append a new `describe` block after the existing ones:

```ts
import { findMatchingPrice } from "@/lib/card-catalog";

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
```

Note: you'll need to add `CatalogCard` to the import at the top of the test file:
```ts
import { searchCatalog, findMatchingPrice, type CatalogCard } from "@/lib/card-catalog";
```

**Step 2: Run tests to verify they fail**

```bash
bun run vitest src/lib/__tests__/card-catalog.test.ts --reporter=verbose
```

Expected: FAIL — `findMatchingPrice is not exported`

**Step 3: Implement `findMatchingPrice` in `src/lib/card-catalog.ts`**

Add this interface and function after the existing `CatalogCard` interface (around line 13), then export it:

```ts
export interface PriceMatchParams {
  year: number;
  brand: string;
  setName?: string;
  cardNumber?: string;
  variant?: string;
}

export function findMatchingPrice(
  cards: CatalogCard[],
  params: PriceMatchParams,
): number | null {
  const match = cards.find((card) => {
    if (card.year !== params.year) return false;
    if (card.brand !== params.brand) return false;
    if (params.setName != null && card.setName !== params.setName) return false;
    if (params.cardNumber != null && card.cardNumber !== params.cardNumber) return false;
    if (params.variant != null && card.variant !== params.variant) return false;
    return true;
  });
  return match?.rawPrice ?? null;
}
```

**Step 4: Run tests to verify they pass**

```bash
bun run vitest src/lib/__tests__/card-catalog.test.ts --reporter=verbose
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/card-catalog.ts src/lib/__tests__/card-catalog.test.ts
git commit -m "feat: add findMatchingPrice helper to card-catalog"
```

---

### Task 2: New API route `GET /api/cardsight/price`

**Files:**
- Create: `src/app/api/cardsight/price/route.ts`
- Create: `src/app/api/cardsight/price/__tests__/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/cardsight/price/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/cardsight/price/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/card-catalog", () => ({
  searchCatalog: vi.fn(),
  findMatchingPrice: vi.fn(),
}));

import { searchCatalog, findMatchingPrice } from "@/lib/card-catalog";
const mockSearchCatalog = vi.mocked(searchCatalog);
const mockFindMatchingPrice = vi.mocked(findMatchingPrice);

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

  it("returns { price: number } when a match is found", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    mockSearchCatalog.mockResolvedValueOnce([]);
    mockFindMatchingPrice.mockReturnValueOnce(12.50);

    const req = makeRequest({ player: "Rickey Henderson", year: "1985", brand: "Topps" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ price: 12.50 });
  });

  it("returns { price: null } when no match is found", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    mockSearchCatalog.mockResolvedValueOnce([]);
    mockFindMatchingPrice.mockReturnValueOnce(null);

    const req = makeRequest({ player: "Rickey Henderson", year: "1985", brand: "Topps" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ price: null });
  });

  it("returns 502 when searchCatalog fails", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    mockSearchCatalog.mockResolvedValueOnce(null);

    const req = makeRequest({ player: "Rickey Henderson", year: "1985", brand: "Topps" });
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("passes optional params to findMatchingPrice", async () => {
    process.env.CARDSIGHT_API_KEY = "test-key";
    const fakeCatalog = [{ playerName: "Rickey Henderson", year: 1985, brand: "Topps" }];
    mockSearchCatalog.mockResolvedValueOnce(fakeCatalog);
    mockFindMatchingPrice.mockReturnValueOnce(5.00);

    const req = makeRequest({
      player: "Rickey Henderson",
      year: "1985",
      brand: "Topps",
      setName: "Base Set",
      cardNumber: "695",
      variant: "Foil",
    });
    await GET(req);

    expect(mockFindMatchingPrice).toHaveBeenCalledWith(fakeCatalog, {
      year: 1985,
      brand: "Topps",
      setName: "Base Set",
      cardNumber: "695",
      variant: "Foil",
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
bun run vitest src/app/api/cardsight/price/__tests__/route.test.ts --reporter=verbose
```

Expected: FAIL — module not found

**Step 3: Create the route**

Create `src/app/api/cardsight/price/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { searchCatalog, findMatchingPrice } from "@/lib/card-catalog";

export async function GET(request: NextRequest) {
  const apiKey = process.env.CARDSIGHT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CARDSIGHT_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const params = request.nextUrl.searchParams;
  const player = params.get("player");
  const yearRaw = params.get("year");
  const brand = params.get("brand");

  if (!player || !yearRaw || !brand) {
    return NextResponse.json(
      { error: "player, year, and brand are required" },
      { status: 400 },
    );
  }

  const year = Number(yearRaw);
  const setName = params.get("setName") ?? undefined;
  const cardNumber = params.get("cardNumber") ?? undefined;
  const variant = params.get("variant") ?? undefined;

  const catalog = await searchCatalog({ player }, apiKey);
  if (catalog === null) {
    return NextResponse.json(
      { error: "CardSight catalog search failed" },
      { status: 502 },
    );
  }

  const price = findMatchingPrice(catalog, { year, brand, setName, cardNumber, variant });
  return NextResponse.json({ price });
}
```

**Step 4: Run tests to verify they pass**

```bash
bun run vitest src/app/api/cardsight/price/__tests__/route.test.ts --reporter=verbose
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/app/api/cardsight/price/route.ts src/app/api/cardsight/price/__tests__/route.test.ts
git commit -m "feat: add cardsight price API route"
```

---

### Task 3: Add market price UI to card detail page

**Files:**
- Modify: `src/app/collection/[id]/page.tsx`

No new tests needed here — this is display-only client state. The logic (fetching, state transitions) is straightforward and the underlying functions are already tested.

**Step 1: Add the `MarketPriceState` type and state variable**

At the top of `CardDetailPage` (around line 41, after existing `useState` declarations), add:

```ts
type MarketPriceState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; price: number }
  | { status: "not-found" }
  | { status: "error" };

// inside CardDetailPage:
const [marketPrice, setMarketPrice] = useState<MarketPriceState>({ status: "idle" });
```

**Step 2: Add the fetch handler**

Add this function inside `CardDetailPage`, after the existing `handleDelete` function (around line 87):

```ts
async function fetchMarketPrice() {
  if (!card) return;
  setMarketPrice({ status: "loading" });

  const params = new URLSearchParams({
    player: card.playerName,
    year: String(card.year),
    brand: card.brand!,
  });
  if (card.setName) params.set("setName", card.setName);
  if (card.cardNumber) params.set("cardNumber", card.cardNumber);
  if (card.variant) params.set("variant", card.variant);

  try {
    const res = await fetch(`/api/cardsight/price?${params.toString()}`);
    if (!res.ok) {
      setMarketPrice({ status: "error" });
      return;
    }
    const body = await res.json() as { price: number | null };
    setMarketPrice(
      body.price != null
        ? { status: "found", price: body.price }
        : { status: "not-found" },
    );
  } catch {
    setMarketPrice({ status: "error" });
  }
}
```

**Step 3: Add the Market Price row to the Purchase & Location section**

The Purchase & Location section currently has a conditional wrapper:
```tsx
{(card.purchasePrice != null || card.purchaseDate || card.purchaseSource || card.location) && (
```

Remove that outer condition so the section always renders. The section should become:

```tsx
<div className="rounded-lg border border-gray-200 bg-white p-4">
  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Purchase & Location</h2>
  <div className="grid grid-cols-3 gap-3">
    {card.purchasePrice != null && (
      <div>
        <p className="text-xs text-gray-500">Price</p>
        <p className="text-sm font-medium text-gray-900">${card.purchasePrice.toFixed(2)}</p>
      </div>
    )}
    {card.purchaseDate && (
      <div>
        <p className="text-xs text-gray-500">Date</p>
        <p className="text-sm font-medium text-gray-900">{card.purchaseDate}</p>
      </div>
    )}
    {card.purchaseSource && (
      <div>
        <p className="text-xs text-gray-500">Source</p>
        <p className="text-sm font-medium text-gray-900">{card.purchaseSource}</p>
      </div>
    )}
    {card.location && (
      <div>
        <p className="text-xs text-gray-500">Location</p>
        <Link
          href={`/collection?location=${encodeURIComponent(card.location)}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          {card.location}
        </Link>
      </div>
    )}
    {card.playerName && card.year && card.brand && (
      <div>
        <p className="text-xs text-gray-500">Market Price</p>
        <MarketPriceDisplay state={marketPrice} onFetch={fetchMarketPrice} />
      </div>
    )}
  </div>
</div>
```

**Step 4: Add the `MarketPriceDisplay` sub-component**

Add this private component near the top of the file, below the existing `RotateControls` component (around line 30):

```tsx
function MarketPriceDisplay({
  state,
  onFetch,
}: {
  state: MarketPriceState;
  onFetch: () => void;
}) {
  if (state.status === "found") {
    return <p className="text-sm font-medium text-gray-900">${state.price.toFixed(2)}</p>;
  }
  if (state.status === "not-found") {
    return <p className="text-sm text-gray-400">Not found</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-500">Lookup failed</p>;
  }
  return (
    <button
      type="button"
      onClick={onFetch}
      disabled={state.status === "loading"}
      className="text-sm font-medium text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
    >
      {state.status === "loading" ? "Loading…" : "Check"}
    </button>
  );
}
```

Note: `MarketPriceDisplay` references `MarketPriceState` — move the type definition to module scope (above both sub-components) so both can use it.

**Step 5: Verify the app builds without TypeScript errors**

```bash
bun run build
```

Expected: build succeeds with no type errors

**Step 6: Commit**

```bash
git add src/app/collection/[id]/page.tsx
git commit -m "feat: add market price lookup to card detail page"
```

---

### Task 4: Full test suite verification

**Step 1: Run all tests**

```bash
bun run vitest --reporter=verbose
```

Expected: All tests pass

**Step 2: If any tests fail, fix before continuing**

Common issue: the `MarketPriceState` type needs to be defined before `RotateControls` if it's used in `MarketPriceDisplay`. Ensure the order in the file is: type definition → sub-components → page component.
