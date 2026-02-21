# Photo Quality Scanner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "Experimental" tab to the Tools page with a `PhotoQualityScanner` tool that scans card photos and flags those with blur, noise/grain, or excessive background.

**Architecture:** A new `GET /api/tools/photo-quality` route reads all cards with images from the DB, processes each image file with Sharp (already installed), and returns flagged results. The `PhotoQualityScanner` component lives in `src/app/tools/page.tsx` and follows the existing scan → results pattern used by `DataAudit`. Image analysis helpers are extracted to `src/lib/photo-quality.ts` so they can be unit-tested independently.

**Tech Stack:** Next.js App Router, Sharp (image processing), bun test (unit tests), TailwindCSS, TypeScript

---

### Task 1: Create image quality analysis helpers with tests

**Files:**
- Create: `src/lib/photo-quality.ts`
- Create: `src/lib/photo-quality.test.ts`

The helpers take raw Sharp `Stats` output (already computed by the caller) and return a 0–100 score for each quality dimension. Separating the math from Sharp I/O makes them testable without disk access.

**Step 1: Create the test file**

```typescript
// src/lib/photo-quality.test.ts
import { describe, expect, it } from "bun:test";
import {
  blurScore,
  noiseScore,
  backgroundScore,
  type ChannelStats,
} from "./photo-quality";

// ChannelStats mirrors the shape returned by sharp().stats() for one channel
// { mean: number; stdev: number; min: number; max: number }

describe("blurScore", () => {
  it("returns low score for low-stdev laplacian output (blurry)", () => {
    // A blurry image produces nearly uniform output from a Laplacian kernel,
    // so the stdev of that output is very low.
    const laplacianStats: ChannelStats = { mean: 10, stdev: 3, min: 0, max: 30 };
    expect(blurScore(laplacianStats)).toBeLessThan(15);
  });

  it("returns high score for high-stdev laplacian output (sharp)", () => {
    const laplacianStats: ChannelStats = { mean: 50, stdev: 60, min: 0, max: 255 };
    expect(blurScore(laplacianStats)).toBeGreaterThan(50);
  });
});

describe("noiseScore", () => {
  it("returns low score for smooth image (low residual stdev)", () => {
    // residualStdev is computed externally as (original stdev - blurred stdev)
    expect(noiseScore(2)).toBeLessThan(20);
  });

  it("returns high score for grainy image (high residual stdev)", () => {
    expect(noiseScore(55)).toBeGreaterThan(70);
  });
});

describe("backgroundScore", () => {
  it("returns high score when all corners are uniform (pure background)", () => {
    // All four corner patches have nearly identical mean color — uniform background.
    const corners: ChannelStats[] = [
      { mean: 240, stdev: 2, min: 235, max: 245 },
      { mean: 238, stdev: 2, min: 233, max: 243 },
      { mean: 241, stdev: 2, min: 236, max: 246 },
      { mean: 239, stdev: 2, min: 234, max: 244 },
    ];
    expect(backgroundScore(corners)).toBeGreaterThan(60);
  });

  it("returns low score when corners have varied content", () => {
    // Corners differ from each other — card fills the frame.
    const corners: ChannelStats[] = [
      { mean: 240, stdev: 40, min: 100, max: 255 },
      { mean: 80,  stdev: 35, min: 20,  max: 200 },
      { mean: 160, stdev: 50, min: 30,  max: 255 },
      { mean: 200, stdev: 45, min: 60,  max: 255 },
    ];
    expect(backgroundScore(corners)).toBeLessThan(40);
  });
});
```

**Step 2: Run the test to confirm it fails (module doesn't exist yet)**

```bash
bun test src/lib/photo-quality.test.ts
```

Expected: error — `Cannot find module './photo-quality'`

**Step 3: Create the implementation**

```typescript
// src/lib/photo-quality.ts

export interface ChannelStats {
  mean: number;
  stdev: number;
  min: number;
  max: number;
}

/**
 * Scores sharpness from Laplacian-filtered image stats.
 * Low score = blurry. Scale: 0 (very blurry) to 100 (very sharp).
 * Input: stats of the image after applying a Laplacian convolution kernel.
 */
export function blurScore(laplacianStats: ChannelStats): number {
  // Cap stdev at 100 for scoring purposes, then scale to 0-100.
  return Math.min(100, Math.round((laplacianStats.stdev / 100) * 100));
}

/**
 * Scores noise/grain from the residual between original and blurred image stdev.
 * High score = noisy. Scale: 0 (smooth) to 100 (very grainy).
 * Input: residualStdev = original.stdev - blurred.stdev (per-channel average).
 */
export function noiseScore(residualStdev: number): number {
  // Map residualStdev 0–80 to score 0–100.
  return Math.min(100, Math.round((residualStdev / 80) * 100));
}

/**
 * Scores background uniformity from four corner patch stats.
 * High score = uniform background (card is small in frame).
 * Scale: 0 (varied corners, card fills frame) to 100 (all corners identical).
 * Input: array of exactly 4 ChannelStats, one per corner patch (grayscale mean).
 */
export function backgroundScore(corners: ChannelStats[]): number {
  const means = corners.map((c) => c.mean);
  const avg = means.reduce((a, b) => a + b, 0) / means.length;
  const variance =
    means.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / means.length;
  const spreadStdev = Math.sqrt(variance);

  // Low spread between corner means = uniform = high background score.
  // Map spread 0–80 inverted to 0–100.
  const uniformity = Math.max(0, 1 - spreadStdev / 80);

  // Also factor in low per-patch stdev (each corner itself is uniform).
  const avgPatchStdev = corners.reduce((s, c) => s + c.stdev, 0) / corners.length;
  const patchUniformity = Math.max(0, 1 - avgPatchStdev / 60);

  return Math.round(((uniformity + patchUniformity) / 2) * 100);
}
```

**Step 4: Run tests to confirm they pass**

```bash
bun test src/lib/photo-quality.test.ts
```

Expected: all 4 tests pass

**Step 5: Commit**

```bash
git add src/lib/photo-quality.ts src/lib/photo-quality.test.ts
git commit -m "feat: add photo quality scoring helpers with tests"
```

---

### Task 2: Create the API route

**Files:**
- Create: `src/app/api/tools/photo-quality/route.ts`

This route fetches all cards, finds those with images, runs Sharp analysis, and returns flagged results.

**Step 1: Write the failing test**

This route depends on the DB and filesystem, so test it manually via curl after the server is running rather than with unit tests. Skip to implementation.

**Step 2: Create the route**

```typescript
// src/app/api/tools/photo-quality/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { getDb } from "@/db";
import { listCards } from "@/db/cards";
import { blurScore, noiseScore, backgroundScore } from "@/lib/photo-quality";
import type { ChannelStats } from "@/lib/photo-quality";

export interface FlaggedCard {
  cardId: string;
  playerName: string;
  year: number | null;
  brand: string | null;
  imageType: "front" | "back";
  issues: ("blur" | "noise" | "background")[];
  scores: { blur: number; noise: number; background: number };
}

interface PhotoQualityResponse {
  total: number;
  flagged: FlaggedCard[];
}

const BLUR_FLAG_THRESHOLD = 15;
const NOISE_FLAG_THRESHOLD = 70;
const BACKGROUND_FLAG_THRESHOLD = 60;

// Laplacian kernel for edge detection. Low output variance = blurry image.
const LAPLACIAN_KERNEL = {
  width: 3,
  height: 3,
  kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
};

async function analyzeImage(imagePath: string): Promise<FlaggedCard["scores"] & { issues: FlaggedCard["issues"] }> {
  const absolutePath = path.join(process.cwd(), "public", imagePath);

  const baseImage = sharp(absolutePath).greyscale();

  // Blur: apply Laplacian, measure output stdev.
  const laplacianBuffer = await baseImage.clone().convolve(LAPLACIAN_KERNEL).toBuffer();
  const laplacianStats = await sharp(laplacianBuffer).stats();
  const blur = blurScore(laplacianStats.channels[0] as ChannelStats);

  // Noise: compare original stdev vs blurred stdev; residual = noise.
  const [originalStats, blurredStats] = await Promise.all([
    baseImage.clone().stats(),
    baseImage.clone().blur(3).stats(),
  ]);
  const avgResidual =
    originalStats.channels.reduce(
      (sum, ch, i) => sum + Math.max(0, (ch as ChannelStats).stdev - (blurredStats.channels[i] as ChannelStats).stdev),
      0,
    ) / originalStats.channels.length;
  const noise = noiseScore(avgResidual);

  // Background: sample 20x20 patches from all four corners.
  const meta = await baseImage.clone().metadata();
  const { width = 100, height = 100 } = meta;
  const patchSize = 20;

  const cornerExtracts = await Promise.all([
    baseImage.clone().extract({ left: 0, top: 0, width: patchSize, height: patchSize }).stats(),
    baseImage.clone().extract({ left: Math.max(0, width - patchSize), top: 0, width: patchSize, height: patchSize }).stats(),
    baseImage.clone().extract({ left: 0, top: Math.max(0, height - patchSize), width: patchSize, height: patchSize }).stats(),
    baseImage.clone().extract({ left: Math.max(0, width - patchSize), top: Math.max(0, height - patchSize), width: patchSize, height: patchSize }).stats(),
  ]);

  const cornerStats = cornerExtracts.map((s) => s.channels[0] as ChannelStats);
  const background = backgroundScore(cornerStats);

  const issues: FlaggedCard["issues"] = [];
  if (blur < BLUR_FLAG_THRESHOLD) issues.push("blur");
  if (noise > NOISE_FLAG_THRESHOLD) issues.push("noise");
  if (background > BACKGROUND_FLAG_THRESHOLD) issues.push("background");

  return { blur, noise, background, issues };
}

export async function GET() {
  const db = getDb();
  const allCards = listCards(db);

  const flagged: FlaggedCard[] = [];
  let total = 0;

  for (const card of allCards) {
    const imagesToCheck: Array<{ path: string; type: "front" | "back" }> = [];

    if (card.imageFront) imagesToCheck.push({ path: card.imageFront, type: "front" });
    if (card.imageBack) imagesToCheck.push({ path: card.imageBack, type: "back" });

    for (const { path: imagePath, type } of imagesToCheck) {
      const absolutePath = path.join(process.cwd(), "public", imagePath);
      if (!fs.existsSync(absolutePath)) continue;

      total++;

      try {
        const { issues, ...scores } = await analyzeImage(imagePath);
        if (issues.length > 0) {
          flagged.push({
            cardId: card.id,
            playerName: card.playerName,
            year: card.year ?? null,
            brand: card.brand ?? null,
            imageType: type,
            issues,
            scores,
          });
        }
      } catch (err) {
        console.error(`photo-quality: skipping ${imagePath}:`, err);
      }
    }
  }

  return NextResponse.json({ total, flagged } satisfies PhotoQualityResponse);
}
```

**Step 3: Manually smoke-test the route**

Start the dev server and verify the route responds:

```bash
bun dev &
sleep 3
curl -s http://localhost:3000/api/tools/photo-quality | python3 -m json.tool | head -30
```

Expected: JSON with `{ "total": <number>, "flagged": [...] }`

Kill the dev server when done (`kill %1`).

**Step 4: Commit**

```bash
git add src/app/api/tools/photo-quality/route.ts
git commit -m "feat: add photo quality API route"
```

---

### Task 3: Add Experimental tab and PhotoQualityScanner component to Tools page

**Files:**
- Modify: `src/app/tools/page.tsx`

This task has three parts: add the tab type, add the component, wire up the tab. Make all three changes before committing.

**Step 1: Add `"experimental"` to the tab union type**

Find this block in `src/app/tools/page.tsx` (around line 1262):
```typescript
type ToolsTab = "audit" | "bulk" | "export";

const TABS: { key: ToolsTab; label: string }[] = [
  { key: "audit", label: "Audit & Cleanup" },
  { key: "bulk", label: "Bulk Operations" },
  { key: "export", label: "Export & Listings" },
];
```

Replace with:
```typescript
type ToolsTab = "audit" | "bulk" | "export" | "experimental";

const TABS: { key: ToolsTab; label: string }[] = [
  { key: "audit", label: "Audit & Cleanup" },
  { key: "bulk", label: "Bulk Operations" },
  { key: "export", label: "Export & Listings" },
  { key: "experimental", label: "Experimental" },
];
```

**Step 2: Add the `PhotoQualityScanner` component**

Add this component to `src/app/tools/page.tsx` just before the `ToolsPage` export (around line 1262 — directly above the `type ToolsTab` declaration). It follows the same pattern as `DataAudit`:

```typescript
type QualityIssue = "blur" | "noise" | "background";

interface FlaggedCard {
  cardId: string;
  playerName: string;
  year: number | null;
  brand: string | null;
  imageType: "front" | "back";
  issues: QualityIssue[];
  scores: { blur: number; noise: number; background: number };
}

const ISSUE_LABELS: Record<QualityIssue, { label: string; color: string }> = {
  blur: { label: "Blurry", color: "bg-purple-50 text-purple-600" },
  noise: { label: "Noisy", color: "bg-orange-50 text-orange-600" },
  background: { label: "Background", color: "bg-yellow-50 text-yellow-600" },
};

function PhotoQualityScanner() {
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [flagged, setFlagged] = useState<FlaggedCard[]>([]);

  async function scan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/photo-quality");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setTotal(data.total);
      setFlagged(data.flagged);
      setScanned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        Photo Quality Scanner
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Analyzes card photos for quality issues: blur/focus, grain/noise, and
        excessive background. Both front and back images are checked.
      </p>

      {!scanned && (
        <button
          onClick={scan}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Scanning..." : "Scan Photos"}
        </button>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {scanned && (
        <>
          <p className="mb-4 text-sm text-gray-600">
            {flagged.length === 0
              ? `All ${total} photos look good!`
              : `${flagged.length} of ${total} photos flagged for quality issues.`}
          </p>

          {flagged.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Card</th>
                    <th className="pb-2 font-medium">Image</th>
                    <th className="pb-2 font-medium">Issues</th>
                    <th className="pb-2 font-medium">Scores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {flagged.map((card, i) => (
                    <tr key={`${card.cardId}-${card.imageType}-${i}`} className="py-2">
                      <td className="py-2 pr-4">
                        <Link
                          href={`/collection/${card.cardId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {card.playerName}
                        </Link>
                        <div className="text-xs text-gray-400">
                          {[card.year, card.brand].filter(Boolean).join(" ")}
                        </div>
                      </td>
                      <td className="py-2 pr-4 capitalize text-gray-600">
                        {card.imageType}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {card.issues.map((issue) => (
                            <span
                              key={issue}
                              className={`rounded-full px-2 py-0.5 text-xs ${ISSUE_LABELS[issue].color}`}
                            >
                              {ISSUE_LABELS[issue].label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 text-xs text-gray-400">
                        blur: {card.scores.blur} · noise: {card.scores.noise} · bg: {card.scores.background}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

**Step 3: Wire up the Experimental tab**

Find the closing `</div>` of the tab content block in `ToolsPage` (around line 1337). Add the new tab case before it:

```typescript
        {activeTab === "experimental" && (
          <>
            <PhotoQualityScanner />
          </>
        )}
```

**Step 4: Verify the app builds without TypeScript errors**

```bash
bun run build 2>&1 | tail -20
```

Expected: build completes with no type errors. (Warnings about unused vars or next config are OK; type errors are not.)

**Step 5: Commit**

```bash
git add src/app/tools/page.tsx
git commit -m "feat: add Experimental tab with PhotoQualityScanner component"
```

---

### Task 4: Manual end-to-end verification

**Step 1: Start the dev server**

```bash
bun dev
```

**Step 2: Open the Tools page**

Navigate to `http://localhost:3000/tools` in a browser.

Verify:
- Four tabs appear: Audit & Cleanup, Bulk Operations, Export & Listings, Experimental
- Clicking "Experimental" shows the Photo Quality Scanner panel
- "Scan Photos" button is present

**Step 3: Run a scan**

Click "Scan Photos". Verify:
- Button shows "Scanning..." while running
- Results appear with a summary line
- Flagged cards (if any) show in a table with issue badges and numeric scores
- Each card name is a clickable link

**Step 4: Verify edge cases**

- If no cards have images, scan should complete and show "0 of 0 photos flagged" (or similar)
- If all images are fine, shows "All X photos look good!"

**Step 5: Commit any fixups found during testing**

```bash
git add -p   # stage only the relevant changes
git commit -m "fix: photo quality scanner <describe the fix>"
```

---

### Task 5: Threshold calibration (optional follow-up)

After running the scanner on real data, the thresholds may need tuning. Current defaults:
- Blur flag if score < 15
- Noise flag if score > 70
- Background flag if score > 60

To adjust, edit the constants in `src/app/api/tools/photo-quality/route.ts`:
```typescript
const BLUR_FLAG_THRESHOLD = 15;      // lower = fewer blur flags
const NOISE_FLAG_THRESHOLD = 70;     // higher = fewer noise flags
const BACKGROUND_FLAG_THRESHOLD = 60; // higher = fewer background flags
```

Re-run the scan and review results. Commit any threshold changes:
```bash
git add src/app/api/tools/photo-quality/route.ts
git commit -m "tune: adjust photo quality flag thresholds after calibration"
```
