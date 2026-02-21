# sharp-image-grid Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create and publish `sharp-image-grid`, a TypeScript npm package that composites multiple image Buffers into a JPEG grid layout using `sharp`.

**Architecture:** A new standalone git repo at `~/CodeProjects/sharp-image-grid`. The package exposes a single async function `createGrid(images, options?)` with sensible defaults. `sharp` is a peer dependency. Imago's stitch route is refactored to depend on it after publishing.

**Tech Stack:** TypeScript, Bun, Vitest, tsup (dual ESM/CJS build), sharp (peer dep), GitHub Actions (npm publish on tag)

---

## Task 1: Create and initialize the repo

**Files:**
- Create: `~/CodeProjects/sharp-image-grid/` (new directory)

**Step 1: Create the directory and initialize git**

```bash
mkdir ~/CodeProjects/sharp-image-grid
cd ~/CodeProjects/sharp-image-grid
git init
```

**Step 2: Create `package.json`**

Create `package.json`:

```json
{
  "name": "sharp-image-grid",
  "version": "1.0.0",
  "description": "Composite multiple images into a grid layout using sharp",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "main": "./dist/index.cjs",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "prepublishOnly": "bun run test && bun run build"
  },
  "peerDependencies": {
    "sharp": ">=0.32.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "sharp": "^0.33.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

**Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 4: Create `tsup.config.ts`**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
});
```

**Step 5: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

**Step 6: Create `.gitignore`**

```
node_modules/
dist/
*.tsbuildinfo
```

**Step 7: Install dependencies**

```bash
bun install
```

Expected: `node_modules/` created, `bun.lockb` written.

**Step 8: Commit**

```bash
git add .
git commit -m "chore: initialize sharp-image-grid package"
```

---

## Task 2: Create source stubs

**Files:**
- Create: `src/grid.ts`
- Create: `src/index.ts`

**Step 1: Create `src/index.ts`**

```typescript
export { createGrid } from "./grid.js";
export type { GridOptions } from "./grid.js";
```

**Step 2: Create `src/grid.ts` stub**

```typescript
import type sharp from "sharp";

export interface GridOptions {
  cols?: number;
  cellWidth?: number;
  cellHeight?: number;
  gap?: number;
  background?: { r: number; g: number; b: number };
  quality?: number;
}

export async function createGrid(
  _images: Buffer[],
  _options?: GridOptions,
): Promise<Buffer> {
  throw new Error("not implemented");
}
```

Note: The `sharp` import is type-only here so TypeScript is satisfied. The real import (value import) comes in Task 3.

**Step 3: Commit**

```bash
git add src/
git commit -m "chore: add source stubs"
```

---

## Task 3: TDD — validation errors

**Files:**
- Create: `tests/grid.test.ts`
- Modify: `src/grid.ts`

**Step 1: Create `tests/grid.test.ts` with validation tests**

```typescript
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { createGrid } from "../src/index.js";

async function makeTestImage(
  width = 100,
  height = 100,
  color = { r: 200, g: 200, b: 200 },
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: color },
  })
    .jpeg()
    .toBuffer();
}

describe("createGrid — validation", () => {
  it("throws when images is empty", async () => {
    await expect(createGrid([])).rejects.toThrow("images must not be empty");
  });

  it("throws when cols is 0", async () => {
    const img = await makeTestImage();
    await expect(createGrid([img], { cols: 0 })).rejects.toThrow(
      "cols must be greater than 0",
    );
  });

  it("throws when cols is negative", async () => {
    const img = await makeTestImage();
    await expect(createGrid([img], { cols: -1 })).rejects.toThrow(
      "cols must be greater than 0",
    );
  });

  it("throws when quality is 0", async () => {
    const img = await makeTestImage();
    await expect(createGrid([img], { quality: 0 })).rejects.toThrow(
      "quality must be between 1 and 100",
    );
  });

  it("throws when quality is 101", async () => {
    const img = await makeTestImage();
    await expect(createGrid([img], { quality: 101 })).rejects.toThrow(
      "quality must be between 1 and 100",
    );
  });
});
```

**Step 2: Run tests — expect failures**

```bash
bun run test
```

Expected: all 5 tests FAIL with "not implemented".

**Step 3: Implement validation in `src/grid.ts`**

Replace the stub with:

```typescript
import sharpLib from "sharp";

export interface GridOptions {
  cols?: number;
  cellWidth?: number;
  cellHeight?: number;
  gap?: number;
  background?: { r: number; g: number; b: number };
  quality?: number;
}

const DEFAULTS = {
  cols: 2,
  cellWidth: 400,
  cellHeight: 560,
  gap: 12,
  background: { r: 255, g: 255, b: 255 },
  quality: 90,
} as const;

export async function createGrid(
  images: Buffer[],
  options?: GridOptions,
): Promise<Buffer> {
  if (images.length === 0) {
    throw new Error("images must not be empty");
  }

  const cols = options?.cols ?? DEFAULTS.cols;
  if (cols <= 0) {
    throw new Error("cols must be greater than 0");
  }

  const quality = options?.quality ?? DEFAULTS.quality;
  if (quality < 1 || quality > 100) {
    throw new Error("quality must be between 1 and 100");
  }

  throw new Error("not implemented");
}
```

**Step 4: Run tests — expect validation tests to pass**

```bash
bun run test
```

Expected: 5 validation tests PASS.

**Step 5: Commit**

```bash
git add tests/ src/grid.ts
git commit -m "feat: add input validation to createGrid"
```

---

## Task 4: TDD — core grid output

**Files:**
- Modify: `tests/grid.test.ts`
- Modify: `src/grid.ts`

**Step 1: Add output tests to `tests/grid.test.ts`**

Append after the existing `describe` block:

```typescript
describe("createGrid — output", () => {
  it("returns a valid JPEG buffer for a single image", async () => {
    const img = await makeTestImage();
    const result = await createGrid([img]);
    expect(result).toBeInstanceOf(Buffer);
    const meta = await sharp(result).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("returns a valid JPEG buffer for multiple images spanning rows", async () => {
    const images = await Promise.all(
      Array.from({ length: 5 }, () => makeTestImage()),
    );
    const result = await createGrid(images, { cols: 2 });
    expect(result).toBeInstanceOf(Buffer);
    const meta = await sharp(result).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("output canvas dimensions match options", async () => {
    const img = await makeTestImage();
    // cols=1, cellWidth=200, cellHeight=300, gap=10
    // canvasWidth  = 1 * 200 + (1 + 1) * 10 = 220
    // rows         = ceil(1 / 1) = 1
    // canvasHeight = 1 * 300 + (1 + 1) * 10 = 320
    const result = await createGrid([img], {
      cols: 1,
      cellWidth: 200,
      cellHeight: 300,
      gap: 10,
    });
    const meta = await sharp(result).metadata();
    expect(meta.width).toBe(220);
    expect(meta.height).toBe(320);
  });

  it("incomplete last row still produces correct canvas height", async () => {
    // 3 images, cols=2 → 2 rows
    // canvasHeight with defaults: 2 * 560 + 3 * 12 = 1156
    const images = await Promise.all(
      Array.from({ length: 3 }, () => makeTestImage()),
    );
    const result = await createGrid(images, { cols: 2 });
    const meta = await sharp(result).metadata();
    const expectedHeight = 2 * 560 + 3 * 12;
    expect(meta.height).toBe(expectedHeight);
  });
});
```

**Step 2: Run tests — expect new tests to fail**

```bash
bun run test
```

Expected: 4 new tests FAIL with "not implemented".

**Step 3: Complete the implementation in `src/grid.ts`**

Replace the `throw new Error("not implemented")` at the end of `createGrid` with:

```typescript
  const cellWidth = options?.cellWidth ?? DEFAULTS.cellWidth;
  const cellHeight = options?.cellHeight ?? DEFAULTS.cellHeight;
  const gap = options?.gap ?? DEFAULTS.gap;
  const background = options?.background ?? DEFAULTS.background;

  const rows = Math.ceil(images.length / cols);
  const canvasWidth = cols * cellWidth + (cols + 1) * gap;
  const canvasHeight = rows * cellHeight + (rows + 1) * gap;

  const composites = await Promise.all(
    images.map(async (buf, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const resized = await sharpLib(buf)
        .resize(cellWidth, cellHeight, { fit: "contain", background })
        .toBuffer();
      return {
        input: resized,
        left: gap + col * (cellWidth + gap),
        top: gap + row * (cellHeight + gap),
      };
    }),
  );

  return sharpLib({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background,
    },
  })
    .composite(composites)
    .jpeg({ quality })
    .toBuffer();
```

**Step 4: Run tests — expect all tests to pass**

```bash
bun run test
```

Expected: all 9 tests PASS.

**Step 5: Commit**

```bash
git add tests/grid.test.ts src/grid.ts
git commit -m "feat: implement createGrid core logic"
```

---

## Task 5: Verify the build

**Step 1: Run the build**

```bash
bun run build
```

Expected: `dist/` created containing `index.js`, `index.cjs`, `index.d.ts`.

**Step 2: Spot-check the output**

```bash
ls dist/
```

Expected: `index.js  index.cjs  index.d.ts` (and possibly chunk files from tsup).

**Step 3: Commit**

No new files to commit (dist is gitignored). If `tsup.config.ts` changed, commit it.

---

## Task 6: Write the README

**Files:**
- Create: `README.md`

**Step 1: Create `README.md`**

```markdown
# sharp-image-grid

Composite multiple images into a grid layout using [sharp](https://sharp.pixelplumbing.com/).

## Install

```bash
npm install sharp-image-grid
npm install sharp   # peer dependency
```

## Usage

```typescript
import { createGrid } from "sharp-image-grid";
import { readFile, writeFile } from "fs/promises";

const images = await Promise.all([
  readFile("card1.jpg"),
  readFile("card2.jpg"),
  readFile("card3.jpg"),
  readFile("card4.jpg"),
]);

const grid = await createGrid(images);
await writeFile("grid.jpg", grid);
```

## API

### `createGrid(images, options?)`

| Parameter | Type | Description |
|---|---|---|
| `images` | `Buffer[]` | Image buffers to composite. Must not be empty. |
| `options` | `GridOptions` | Optional layout configuration. |

### `GridOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `cols` | `number` | `2` | Number of columns. Must be > 0. |
| `cellWidth` | `number` | `400` | Width of each cell in pixels. |
| `cellHeight` | `number` | `560` | Height of each cell in pixels. |
| `gap` | `number` | `12` | Gap between cells (and outer border) in pixels. |
| `background` | `{ r, g, b }` | white | Fill color for letterboxed space and empty cells. |
| `quality` | `number` | `90` | JPEG quality (1–100). |

**Returns:** `Promise<Buffer>` — JPEG image buffer.

Each image is resized with `fit: "contain"` into its cell, centered, with `background` filling any letterbox space. Rows are derived automatically from `images.length` and `cols`. Incomplete last rows are filled with background color.

## Real-world example

This package was extracted from [imago](https://github.com/MarkNenadov/imago), a sports card collection manager that uses it to build composite lot images for marketplace listings.

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Task 7: GitHub Actions publish workflow

**Files:**
- Create: `.github/workflows/publish.yml`

**Step 1: Create `.github/workflows/publish.yml`**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run test
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://registry.npmjs.org"
      - run: bun run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Step 2: Commit**

```bash
git add .github/
git commit -m "ci: add npm publish workflow on version tag"
```

---

## Task 8: Create GitHub repo and publish

**Step 1: Create the GitHub repo**

```bash
gh repo create sharp-image-grid --public --source=. --remote=origin --push
```

**Step 2: Add NPM_TOKEN secret to the repo**

Go to the GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

- Name: `NPM_TOKEN`
- Value: your npm access token (generate at npmjs.com → Account → Access Tokens → Generate New Token → Granular, with publish permission)

**Step 3: Tag and push to trigger publish**

```bash
git tag v1.0.0
git push origin v1.0.0
```

**Step 4: Verify**

Watch the Actions tab on GitHub. Once green, confirm on npmjs.com:

```bash
npm info sharp-image-grid
```

Expected: package metadata including `1.0.0`.

---

## Task 9: Refactor imago to use the published package

**Files:**
- Modify: `~/CodeProjects/imago-bak-2/package.json`
- Modify: `~/CodeProjects/imago-bak-2/src/app/api/tools/stitch/route.ts`

**Step 1: Add `sharp-image-grid` to imago**

In the imago project directory:

```bash
bun add sharp-image-grid
```

**Step 2: Rewrite `src/app/api/tools/stitch/route.ts`**

Replace the local `createComposite` and `chunk` functions with the package. The file currently contains `COLS`, `ROWS`, `CELL_WIDTH`, `CELL_HEIGHT`, `GAP`, `CANVAS_WIDTH`, `CANVAS_HEIGHT`, `loadCardImage`, `createComposite`, and `chunk`. After the refactor it should look like:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readFile } from "fs/promises";
import { createGrid } from "sharp-image-grid";
import { getDb } from "@/db";
import { getCardById } from "@/db/cards";
import type { Card } from "@/db/schema";

async function loadCardImage(imagePath: string): Promise<Buffer> {
  return readFile(join(process.cwd(), "public", imagePath));
}

export async function POST(request: NextRequest) {
  const { cardIds } = await request.json() as { cardIds: string[] };

  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: "cardIds is required" }, { status: 400 });
  }

  const db = getDb();
  const selectedCards = cardIds
    .map((id) => getCardById(db, id))
    .filter((c): c is Card => c != null && c.imageFront != null);

  if (selectedCards.length === 0) {
    return NextResponse.json(
      { error: "No cards with front images found" },
      { status: 400 },
    );
  }

  const imageBuffers = await Promise.all(
    selectedCards.map((c) => loadCardImage(c.imageFront!)),
  );

  // Process in chunks of 6 (2 cols × 3 rows per composite image)
  const CARDS_PER_IMAGE = 6;
  const chunks: Buffer[][] = [];
  for (let i = 0; i < imageBuffers.length; i += CARDS_PER_IMAGE) {
    chunks.push(imageBuffers.slice(i, i + CARDS_PER_IMAGE));
  }

  const compositeBuffers = await Promise.all(
    chunks.map((chunk) =>
      createGrid(chunk, { cols: 2, cellWidth: 400, cellHeight: 560, gap: 12 }),
    ),
  );

  // Return first composite as base64 (existing behavior)
  const base64Images = compositeBuffers.map((buf) =>
    `data:image/jpeg;base64,${buf.toString("base64")}`,
  );

  return NextResponse.json({ images: base64Images });
}
```

Note: Check the existing route's response shape carefully before finalizing — match whatever the frontend expects.

**Step 3: Run imago tests**

```bash
bun run test
```

Expected: all existing tests still pass.

**Step 4: Smoke test the lot builder in the running app**

```bash
bun dev
```

Navigate to Tools → Lot Builder. Select cards and generate — verify composite images render correctly.

**Step 5: Commit**

```bash
git add package.json bun.lockb src/app/api/tools/stitch/route.ts
git commit -m "refactor: use sharp-image-grid package in stitch route"
```
