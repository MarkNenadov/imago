# Wishlist Tab — Design Doc

**Date:** 2026-02-21
**Status:** Approved

## Overview

A dedicated Wishlist tab for tracking specific cards the user wants to acquire. Supports manual entry and a "Fill Gaps" feature that queries the CardSight catalog to find cards a given player had in a year range that aren't already owned or wishlisted.

## Data Model

New `wishlist_items` table — separate from `cards`, no photos or purchase data:

| Field        | Type         | Notes              |
|--------------|--------------|--------------------|
| `id`         | text (UUID)  | Primary key        |
| `playerName` | text         | Required           |
| `year`       | integer      | Optional           |
| `brand`      | text         | Optional           |
| `setName`    | text         | Optional           |
| `cardNumber` | text         | Optional           |
| `variant`    | text         | Optional           |
| `createdAt`  | text         | Auto ISO date      |

No migration to the existing `cards` table.

## Navigation

New **Wishlist** tab added to NavBar between Collection and Statistics:

```
[Imago]  Collection  Wishlist  Statistics  Tools  [+]
```

## UI Layout

### Wishlist Items List (top)

- Sortable list/table of all wishlist items (by player name, year, brand)
- Each row has a delete button — the "I acquired it" action
- **"+ Add Card"** button opens a simple form/modal; `playerName` is required, all other fields optional

### Fill Gaps Panel (bottom)

- Inputs: player name, year from, year to, sport (baseball / hockey)
- **Search** button queries CardSight catalog
- Results are pre-filtered: excludes cards already in `cards` table or `wishlist_items`
- Results shown as a selectable list with checkboxes
- **"Add Selected to Wishlist"** bulk-inserts checked items

## API Routes

| Method   | Route                              | Purpose                                      |
|----------|------------------------------------|----------------------------------------------|
| `GET`    | `/api/wishlist`                    | List all wishlist items                      |
| `POST`   | `/api/wishlist`                    | Add one or many items                        |
| `DELETE` | `/api/wishlist/[id]`               | Remove a single item                         |
| `GET`    | `/api/wishlist/catalog-search`     | Fill Gaps: search catalog, return gaps only  |

### catalog-search query params

`?player=&yearFrom=&yearTo=&sport=`

Server-side deduplication logic:
- Fetch catalog results from CardSight
- Filter out any card matching `playerName + year + brand + cardNumber` in `cards` or `wishlist_items`
- Match is lenient — any two fields aligning counts as a likely duplicate

### CardSight Catalog Spike

Implementation must begin with an explicit spike to discover what CardSight offers for text-based catalog search (expected: something like `GET /v1/catalog/cards?player=...&yearFrom=...`). If no such endpoint exists, the route falls back to querying the local `ReferenceCards` table. The frontend interface is identical either way.

## Error Handling

- CardSight unavailable or returns no results → surface a clear message in the Fill Gaps panel ("No results found" vs. "Catalog search unavailable")
- Sparse `ReferenceCards` fallback → same "no results" message, no crash
- Duplicate detection on manual entry is best-effort only — no hard block

## Testing

- Unit tests for `catalog-search` route: mock CardSight response, verify deduplication logic
- Unit tests for wishlist CRUD routes
- CardSight spike is exploratory — tests follow once the API shape is known
