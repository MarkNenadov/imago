# CardSight Subscription Usage Display — Design

**Date:** 2026-03-07

## Goal

Show the user how many CardSight API calls they have remaining in the current month, visible at all times in the NavBar.

## Approach

Client-side fetch on NavBar mount via a server-side proxy route. The API key stays server-side; the client only receives the processed result.

## Architecture

### `src/lib/cardsight-subscription.ts`

New module (consistent with `card-identifier.ts` / `card-catalog.ts`) that:
- Calls `GET https://api.cardsight.ai/v1/subscription` with `X-API-Key` header
- Returns typed subscription data (remaining calls)
- Returns `null` if API key is missing or the call fails
- Logs raw response for debugging (matching existing pattern)

Note: exact response shape of `/v1/subscription` is unknown at design time; will be mapped defensively after logging.

### `src/app/api/cardsight/subscription/route.ts`

GET route that:
- Returns `404` if `CARDSIGHT_API_KEY` is not set
- Calls `fetchSubscription()` from the lib module
- Returns `502` if upstream call fails
- Returns subscription data as JSON on success

### `NavBar.tsx` updates

- `useEffect` on mount fetches `/api/cardsight/subscription`
- Renders a small `text-xs` pill between the "Tools" link and the `+` button
- Shows `X calls left` in `text-gray-400` when healthy
- Shifts to amber (`text-amber-500`) when remaining calls ≤ 20
- Renders nothing while loading or on any error — no disruption to navigation

## Testing

- Unit tests for `fetchSubscription()`: success, missing API key, upstream error
- Unit tests for the API route: same three cases
- No NavBar test (display logic is trivial, component currently untested)
