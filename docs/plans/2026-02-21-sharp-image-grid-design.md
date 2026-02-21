# sharp-image-grid — Package Design

**Date:** 2026-02-21
**Status:** Approved

## Overview

A TypeScript npm package that composites multiple images into a grid layout using `sharp`. Extracted from imago's lot-builder stitch logic and generalized for broad reuse.

**Motivation:** The image grid compositor in imago is non-trivial, solves a real problem, and fills a genuine gap in the npm ecosystem (most similar packages are unmaintained). It's also general-purpose — useful for contact sheets, product grids, collage previews, and marketplace lot images.

---

## Package Identity

- **Name:** `sharp-image-grid`
- **License:** MIT
- **Repository:** New standalone repo (imago becomes a reference example in the README)
- **Version:** starts at `1.0.0`

---

## API

```typescript
export interface GridOptions {
  cols?: number;       // default: 2
  cellWidth?: number;  // default: 400
  cellHeight?: number; // default: 560
  gap?: number;        // default: 12
  background?: {       // default: { r: 255, g: 255, b: 255 }
    r: number;
    g: number;
    b: number;
  };
  quality?: number;    // default: 90  (JPEG quality 1–100)
}

export async function createGrid(
  images: Buffer[],
  options?: GridOptions,
): Promise<Buffer>
```

- `rows` is always derived: `Math.ceil(images.length / cols)` — never passed explicitly
- Output is always JPEG
- `sharp` is a **peer dependency** — callers install it themselves

---

## Behavior

Each image is resized with `fit: "contain"` into its cell, centered, with the background color filling any letterbox space. Cells are placed left-to-right, top-to-bottom with `gap` pixels between them and as a border around the outer edge.

### Edge Cases

| Situation | Behavior |
|---|---|
| `images` is empty | Throw |
| Fewer images than one full row | Single partial row |
| Last row is incomplete | Empty cells filled with background color |
| Corrupt/unreadable image buffer | Let `sharp` throw — caller's responsibility |
| `cols <= 0` | Throw with clear message |
| `quality` outside 1–100 | Throw with clear message |

---

## Package Structure

```
sharp-image-grid/
├── src/
│   ├── index.ts        # public exports only
│   └── grid.ts         # implementation
├── tests/
│   └── grid.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

**Tooling:** Bun, Vitest, TypeScript. Dual ESM + CJS build via `tsc`, published with type declarations.

**Publishing:** GitHub Actions workflow triggers `npm publish` on tag push.

**imago integration:** Refactor imago's stitch route to use `sharp-image-grid` as a dependency.

---

## Testing

**Cover:**
- Single image → valid JPEG buffer
- Multiple images spanning more than one row → valid JPEG buffer
- Output dimensions match expected canvas size given options
- Empty array throws
- `cols <= 0` throws
- `quality` outside 1–100 throws
- Custom options reflected in output dimensions

**Fixtures:** Small synthetic solid-color buffers generated programmatically with sharp — no binary fixtures in the repo.

**Not tested:** Pixel-perfect visual output, sharp internals.
