# Photo Quality Scanner — Design

**Date:** 2026-02-21
**Status:** Approved

## Overview

A new "Experimental" tab in the Tools section containing a `PhotoQualityScanner` tool. It scans card photos for quality issues and produces a read-only report flagging cards that need to be re-photographed.

## Architecture

### New files
- `src/app/api/tools/photo-quality/route.ts` — GET endpoint, runs Sharp analysis
- Photo quality logic can live inline in the route (small enough)

### Modified files
- `src/app/tools/page.tsx` — add `"experimental"` tab + `PhotoQualityScanner` component

### Data flow
1. User clicks "Scan Photos"
2. Frontend calls `GET /api/tools/photo-quality`
3. API fetches all cards from DB, filters to those with at least one image
4. For each image file, runs three Sharp checks (blur, noise, background)
5. Missing image files on disk are skipped silently
6. Returns `{ total: number, flagged: FlaggedCard[] }`

## Quality Checks

All scores are 0–100. A card is flagged if any single check exceeds its threshold.

| Check | Method | Flag if |
|---|---|---|
| **Blur** | Apply Laplacian convolution kernel via `sharp().convolve()`, measure stdev of output | score < 15 |
| **Noise/grain** | Get stats on original vs Gaussian-blurred version, measure residual difference | score > 70 |
| **Background** | Sample 10×10 corner patches, measure color uniformity across corners | score > 60 |

Both front and back images are checked independently.

## API Response Shape

```ts
type FlaggedCard = {
  cardId: string
  playerName: string
  year: number | null
  brand: string | null
  imageType: "front" | "back"
  issues: ("blur" | "noise" | "background")[]
  scores: { blur: number; noise: number; background: number }
}

type PhotoQualityResponse = {
  total: number       // total images checked
  flagged: FlaggedCard[]
}
```

## UI

The `PhotoQualityScanner` component lives inside the new "Experimental" tab and follows the same scan → results pattern as `DataAudit`.

**States:**
1. **Initial**: Description of checks + "Scan Photos" button
2. **Scanning**: Button disabled, shows "Scanning..."
3. **Results**: Summary line + table

**Results table columns:**
- **Card** — player name, year, brand (links to `/collection?id=...`)
- **Image** — "Front" or "Back"
- **Issues** — colored badges: "Blurry", "Noisy", "Background"
- **Scores** — numeric detail (blur: X, noise: X, background: X)

## Error Handling

- Individual image Sharp failures: logged and skipped, not fatal
- Whole scan failure: red error message in component (matches existing tool pattern)
- Image file missing on disk: silently skipped

## Out of Scope

- Storing quality scores in the database
- Auto-deleting or replacing images
- Configurable thresholds (use hardcoded defaults for now)
- Thumbnail grid view
