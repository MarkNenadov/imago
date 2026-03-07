# Card Market Price Lookup — Design

## Overview

Add an on-demand market price lookup to the card detail page. The user presses a button to fetch the current price via the CardSight API. The value is never persisted — it is display-only and ephemeral.

## API Route

`GET /api/cardsight/price`

### Required query params
- `player` — player name
- `year` — card year
- `brand` — card brand

### Optional query params
- `setName`
- `cardNumber`
- `variant`

### Behavior
1. Returns 400 if any required param is missing.
2. Calls `searchCatalog` from `card-catalog.ts` with the player name.
3. Filters results: a candidate matches if `year`, `brand`, and all provided optional fields exactly equal the catalog card's corresponding fields.
4. Returns `{ price: number }` for the first match, `{ price: null }` if none found.
5. Returns 503 if the CardSight API key is not configured.

## UI — Card Detail Page (`/collection/[id]/page.tsx`)

The Purchase & Location section is updated to always render (not conditional on purchase data existing).

A new "Market Price" row is added within that section containing:
- A "Check Market Price" button, shown when no lookup has been attempted (or when result was "not found")
- Loading state on the button while fetching
- `$X.XX` value on success, styled like the purchase price
- "Not found" in muted gray text if `price` is null
- A brief error message if the request fails (503, network error)

The button is only rendered if the card has `playerName`, `year`, and `brand` set. If any are missing, the market price row is omitted entirely.

## State

A single `marketPrice` state variable in the page component:

```ts
type MarketPriceState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; price: number }
  | { status: "not-found" }
  | { status: "error" };
```

## Testing

- Unit tests for the API route: missing required params → 400, no API key → 503, match found → price, no match → null
- The matching logic (filtering catalog results) extracted into a pure function for easy testing
