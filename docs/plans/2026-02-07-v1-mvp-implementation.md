# Imago v1 MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local-first sports card collection manager with photo upload, card lookup/autocomplete, and rich browsing/filtering.

**Architecture:** Next.js 15 App Router with SQLite (Drizzle ORM) for storage, local filesystem for images, JunkWaxHero CardLists for offline card autocomplete. CardSight AI integration deferred until API access is obtained — the app is fully functional without it.

**Tech Stack:** Next.js 15, Bun, TailwindCSS, Drizzle ORM, better-sqlite3, Vitest, React Testing Library

**Working directory:** `/Users/markn/CodeProjects/imago/.worktrees/v1-mvp`

---

## Task 1: Project Scaffolding

**Files:**
- Create: project root via `create-next-app`
- Create: `drizzle.config.ts`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Create Next.js project**

Run in the worktree directory (files already exist from worktree, so we'll init into a temp dir and move):

```bash
cd /Users/markn/CodeProjects/imago/.worktrees
rm -rf v1-mvp
bunx create-next-app@latest v1-mvp --typescript --eslint --tailwind --app --src-dir --no-turbopack --no-import-alias
```

Select defaults when prompted.

**Step 2: Install dependencies**

```bash
cd /Users/markn/CodeProjects/imago/.worktrees/v1-mvp
bun add drizzle-orm better-sqlite3 uuid
bun add -d drizzle-kit @types/better-sqlite3 @types/uuid vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 3: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./imago.db",
  },
});
```

**Step 4: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `src/test/setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

**Step 5: Create uploads directory**

```bash
mkdir -p public/uploads
```

**Step 6: Verify setup compiles and tests run**

```bash
bun run build
bunx vitest run
```

Expected: build succeeds, vitest runs (0 tests found, exits clean).

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Drizzle, Vitest, and TailwindCSS"
```

---

## Task 2: Database Schema + Connection

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `src/db/__tests__/connection.test.ts`

**Step 1: Write failing test for database connection**

Create `src/db/__tests__/connection.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getDb } from "@/db";

describe("database connection", () => {
  it("should connect and return a database instance", () => {
    const db = getDb(":memory:");
    expect(db).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bunx vitest run src/db/__tests__/connection.test.ts
```

Expected: FAIL — module `@/db` not found.

**Step 3: Create the schema**

Create `src/db/schema.ts`:

```typescript
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  playerName: text("player_name").notNull(),
  year: integer("year"),
  brand: text("brand"),
  setName: text("set_name"),
  cardNumber: text("card_number"),
  team: text("team"),
  sport: text("sport").notNull().default("baseball"),
  variant: text("variant"),
  condition: text("condition"),
  graded: integer("graded", { mode: "boolean" }).notNull().default(false),
  gradeCompany: text("grade_company"),
  gradeValue: real("grade_value"),
  purchasePrice: real("purchase_price"),
  purchaseDate: text("purchase_date"),
  purchaseSource: text("purchase_source"),
  location: text("location"),
  imageFront: text("image_front"),
  imageBack: text("image_back"),
  notes: text("notes"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
```

**Step 4: Create the connection module**

Create `src/db/index.ts`:

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb(url?: string) {
  if (dbInstance && !url) return dbInstance;

  const sqlite = new Database(url ?? "./imago.db");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });

  if (!url) {
    dbInstance = db;
  }

  return db;
}
```

**Step 5: Run test to verify it passes**

```bash
bunx vitest run src/db/__tests__/connection.test.ts
```

Expected: PASS.

**Step 6: Generate and run migration**

```bash
bunx drizzle-kit generate
bunx drizzle-kit push
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add database schema and connection for cards table"
```

---

## Task 3: Cards Data Layer

**Files:**
- Create: `src/db/cards.ts`
- Create: `src/db/__tests__/cards.test.ts`

This task builds the data access functions with TDD. Each function follows: write failing test → implement → verify passing.

**Step 1: Write failing tests for all card operations**

Create `src/db/__tests__/cards.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "@/db";
import {
  createCard,
  getCardById,
  listCards,
  updateCard,
  deleteCard,
  searchCards,
} from "@/db/cards";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

const sampleCard = {
  playerName: "Mike Trout",
  year: 2023,
  brand: "Topps",
  setName: "Chrome",
  cardNumber: "1",
  team: "Angels",
  sport: "baseball" as const,
  variant: "Refractor",
  purchasePrice: 25.0,
  location: "Box 1",
  tags: ["PC", "rookie"],
};

describe("createCard", () => {
  it("should create a card and return it with an id", () => {
    const db = freshDb();
    const card = createCard(db, sampleCard);

    expect(card.id).toBeDefined();
    expect(card.playerName).toBe("Mike Trout");
    expect(card.year).toBe(2023);
    expect(card.tags).toEqual(["PC", "rookie"]);
  });
});

describe("getCardById", () => {
  it("should return a card by id", () => {
    const db = freshDb();
    const created = createCard(db, sampleCard);
    const found = getCardById(db, created.id);

    expect(found).toBeDefined();
    expect(found!.playerName).toBe("Mike Trout");
  });

  it("should return undefined for non-existent id", () => {
    const db = freshDb();
    const found = getCardById(db, "non-existent");

    expect(found).toBeUndefined();
  });
});

describe("listCards", () => {
  it("should return all cards", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, playerName: "Shohei Ohtani" });

    const all = listCards(db);
    expect(all).toHaveLength(2);
  });

  it("should filter by sport", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, playerName: "Connor McDavid", sport: "hockey" });

    const baseball = listCards(db, { sport: "baseball" });
    expect(baseball).toHaveLength(1);
    expect(baseball[0].playerName).toBe("Mike Trout");
  });

  it("should filter by location", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, playerName: "Ohtani", location: "Box 2" });

    const box1 = listCards(db, { location: "Box 1" });
    expect(box1).toHaveLength(1);
  });

  it("should sort by purchase price descending", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, purchasePrice: 10 });
    createCard(db, { ...sampleCard, playerName: "Ohtani", purchasePrice: 50 });

    const sorted = listCards(db, { sortBy: "purchasePrice", sortOrder: "desc" });
    expect(sorted[0].purchasePrice).toBe(50);
  });
});

describe("searchCards", () => {
  it("should search by player name", () => {
    const db = freshDb();
    createCard(db, sampleCard);
    createCard(db, { ...sampleCard, playerName: "Shohei Ohtani" });

    const results = searchCards(db, "trout");
    expect(results).toHaveLength(1);
    expect(results[0].playerName).toBe("Mike Trout");
  });

  it("should search across multiple fields", () => {
    const db = freshDb();
    createCard(db, { ...sampleCard, notes: "great card from LCS" });

    const results = searchCards(db, "LCS");
    expect(results).toHaveLength(1);
  });
});

describe("updateCard", () => {
  it("should update specified fields", () => {
    const db = freshDb();
    const card = createCard(db, sampleCard);

    const updated = updateCard(db, card.id, { location: "Box 5", purchasePrice: 30 });
    expect(updated!.location).toBe("Box 5");
    expect(updated!.purchasePrice).toBe(30);
    expect(updated!.playerName).toBe("Mike Trout");
  });
});

describe("deleteCard", () => {
  it("should delete a card and return true", () => {
    const db = freshDb();
    const card = createCard(db, sampleCard);

    const deleted = deleteCard(db, card.id);
    expect(deleted).toBe(true);

    const found = getCardById(db, card.id);
    expect(found).toBeUndefined();
  });

  it("should return false for non-existent id", () => {
    const db = freshDb();
    const deleted = deleteCard(db, "non-existent");
    expect(deleted).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
bunx vitest run src/db/__tests__/cards.test.ts
```

Expected: FAIL — `@/db/cards` not found.

**Step 3: Implement all card operations**

Create `src/db/cards.ts`:

```typescript
import { eq, like, or, desc, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { cards, type Card, type NewCard } from "./schema";

type Db = Parameters<typeof cards._.columns.id.mapFromDriverValue> extends never
  ? any
  : any;

// Use the actual drizzle db type
type DrizzleDb = ReturnType<typeof import("./index").getDb>;

export function createCard(db: DrizzleDb, data: Omit<NewCard, "id">): Card {
  const id = uuid();
  db.insert(cards).values({ ...data, id }).run();
  return db.select().from(cards).where(eq(cards.id, id)).get()!;
}

export function getCardById(db: DrizzleDb, id: string): Card | undefined {
  return db.select().from(cards).where(eq(cards.id, id)).get();
}

interface ListFilters {
  sport?: string;
  location?: string;
  brand?: string;
  year?: number;
  graded?: boolean;
  sortBy?: keyof Card;
  sortOrder?: "asc" | "desc";
}

export function listCards(db: DrizzleDb, filters?: ListFilters): Card[] {
  let query = db.select().from(cards).$dynamic();

  if (filters?.sport) {
    query = query.where(eq(cards.sport, filters.sport));
  }
  if (filters?.location) {
    query = query.where(eq(cards.location, filters.location));
  }
  if (filters?.brand) {
    query = query.where(eq(cards.brand, filters.brand));
  }
  if (filters?.year) {
    query = query.where(eq(cards.year, filters.year));
  }
  if (filters?.graded !== undefined) {
    query = query.where(eq(cards.graded, filters.graded));
  }

  if (filters?.sortBy) {
    const col = cards[filters.sortBy as keyof typeof cards];
    if (col) {
      query = query.orderBy(
        filters.sortOrder === "desc" ? desc(col) : asc(col),
      );
    }
  }

  return query.all();
}

export function searchCards(db: DrizzleDb, query: string): Card[] {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(cards)
    .where(
      or(
        like(cards.playerName, pattern),
        like(cards.team, pattern),
        like(cards.brand, pattern),
        like(cards.setName, pattern),
        like(cards.notes, pattern),
      ),
    )
    .all();
}

export function updateCard(
  db: DrizzleDb,
  id: string,
  data: Partial<Omit<NewCard, "id">>,
): Card | undefined {
  db.update(cards)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(cards.id, id))
    .run();
  return getCardById(db, id);
}

export function deleteCard(db: DrizzleDb, id: string): boolean {
  const result = db.delete(cards).where(eq(cards.id, id)).run();
  return result.changes > 0;
}
```

**Note:** The `DrizzleDb` type may need adjustment during implementation. Use `ReturnType<typeof getDb>` or define a proper type alias. The tests will guide you.

**Step 4: Run tests to verify they pass**

```bash
bunx vitest run src/db/__tests__/cards.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add cards data layer with CRUD, search, and filtering"
```

---

## Task 4: Cards API Routes

**Files:**
- Create: `src/app/api/cards/route.ts`
- Create: `src/app/api/cards/[id]/route.ts`
- Create: `src/app/api/cards/__tests__/route.test.ts`

**Step 1: Write failing tests for card API routes**

Create `src/app/api/cards/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";

// Test the data layer directly since Next.js route handlers
// are difficult to unit test. Integration tests via the running
// app will cover the HTTP layer.
// These tests verify the request/response transformation logic.

import { getDb } from "@/db";
import { createCard, listCards, getCardById, deleteCard } from "@/db/cards";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

describe("GET /api/cards behavior", () => {
  it("should return empty array when no cards exist", () => {
    const db = freshDb();
    const result = listCards(db);
    expect(result).toEqual([]);
  });

  it("should return cards filtered by sport query param", () => {
    const db = freshDb();
    createCard(db, { playerName: "Trout", sport: "baseball" });
    createCard(db, { playerName: "McDavid", sport: "hockey" });

    const result = listCards(db, { sport: "baseball" });
    expect(result).toHaveLength(1);
    expect(result[0].playerName).toBe("Trout");
  });
});

describe("POST /api/cards behavior", () => {
  it("should require playerName", () => {
    const db = freshDb();
    expect(() => createCard(db, { playerName: "" } as any)).not.toThrow();
    // Route handler should validate and reject empty playerName
  });
});

describe("DELETE /api/cards/[id] behavior", () => {
  it("should return false for non-existent card", () => {
    const db = freshDb();
    expect(deleteCard(db, "fake-id")).toBe(false);
  });
});
```

**Step 2: Run tests to verify they pass** (these test existing data layer)

```bash
bunx vitest run src/app/api/cards/__tests__/route.test.ts
```

**Step 3: Implement GET and POST /api/cards**

Create `src/app/api/cards/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { createCard, listCards, searchCards } from "@/db/cards";

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = request.nextUrl.searchParams;

  const query = params.get("q");
  if (query) {
    const results = searchCards(db, query);
    return NextResponse.json(results);
  }

  const filters = {
    sport: params.get("sport") ?? undefined,
    location: params.get("location") ?? undefined,
    brand: params.get("brand") ?? undefined,
    year: params.has("year") ? Number(params.get("year")) : undefined,
    graded: params.has("graded") ? params.get("graded") === "true" : undefined,
    sortBy: (params.get("sortBy") as any) ?? undefined,
    sortOrder: (params.get("sortOrder") as "asc" | "desc") ?? undefined,
  };

  const cards = listCards(db, filters);
  return NextResponse.json(cards);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  if (!body.playerName?.trim()) {
    return NextResponse.json(
      { error: "playerName is required" },
      { status: 400 },
    );
  }

  const card = createCard(db, body);
  return NextResponse.json(card, { status: 201 });
}
```

**Step 4: Implement GET, PUT, DELETE /api/cards/[id]**

Create `src/app/api/cards/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCardById, updateCard, deleteCard } from "@/db/cards";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const db = getDb();
  const card = getCardById(db, id);

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();
  const card = updateCard(db, id, body);

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const db = getDb();
  const deleted = deleteCard(db, id);

  if (!deleted) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 5: Run all tests**

```bash
bunx vitest run
```

Expected: All PASS.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add REST API routes for cards CRUD"
```

---

## Task 5: Image Upload API

**Files:**
- Create: `src/app/api/images/route.ts`
- Create: `src/app/api/images/__tests__/upload.test.ts`

**Step 1: Write failing test for image filename generation**

Create `src/lib/images.ts` (will hold the helper):

Create `src/lib/__tests__/images.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateImagePath } from "@/lib/images";

describe("generateImagePath", () => {
  it("should generate a path under /uploads/ with the given extension", () => {
    const path = generateImagePath("jpg");
    expect(path).toMatch(/^\/uploads\/[a-f0-9-]+\.jpg$/);
  });

  it("should generate unique paths", () => {
    const path1 = generateImagePath("png");
    const path2 = generateImagePath("png");
    expect(path1).not.toBe(path2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bunx vitest run src/lib/__tests__/images.test.ts
```

Expected: FAIL.

**Step 3: Implement image helper**

Create `src/lib/images.ts`:

```typescript
import { v4 as uuid } from "uuid";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export function generateImagePath(extension: string): string {
  return `/uploads/${uuid()}.${extension}`;
}

export function isAllowedExtension(extension: string): boolean {
  return ALLOWED_EXTENSIONS.has(extension.toLowerCase());
}
```

**Step 4: Run test to verify it passes**

```bash
bunx vitest run src/lib/__tests__/images.test.ts
```

Expected: PASS.

**Step 5: Implement image upload route**

Create `src/app/api/images/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateImagePath, isAllowedExtension } from "@/lib/images";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!isAllowedExtension(extension)) {
    return NextResponse.json(
      { error: "File type not allowed. Use jpg, jpeg, png, or webp." },
      { status: 400 },
    );
  }

  const imagePath = generateImagePath(extension);
  const fullPath = path.join(process.cwd(), "public", imagePath);

  await mkdir(path.dirname(fullPath), { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(fullPath, Buffer.from(bytes));

  return NextResponse.json({ path: imagePath }, { status: 201 });
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add image upload API with file type validation"
```

---

## Task 6: App Layout + Navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/NavBar.tsx`
- Create: `src/components/__tests__/NavBar.test.tsx`

**Step 1: Write failing test for NavBar**

Create `src/components/__tests__/NavBar.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavBar } from "@/components/NavBar";

describe("NavBar", () => {
  it("should render navigation links", () => {
    render(<NavBar />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /collection/i })).toHaveAttribute("href", "/collection");
    expect(screen.getByRole("link", { name: /add card/i })).toHaveAttribute("href", "/add");
  });

  it("should render the app name", () => {
    render(<NavBar />);
    expect(screen.getByText("Imago")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bunx vitest run src/components/__tests__/NavBar.test.tsx
```

Expected: FAIL.

**Step 3: Implement NavBar**

Create `src/components/NavBar.tsx`:

```tsx
import Link from "next/link";

export function NavBar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Imago
          </Link>
          <div className="flex gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/collection"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Collection
            </Link>
            <Link
              href="/add"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Add Card
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

**Step 4: Run test to verify it passes**

```bash
bunx vitest run src/components/__tests__/NavBar.test.tsx
```

Expected: PASS.

**Step 5: Update root layout**

Modify `src/app/layout.tsx` to include the NavBar. Keep the existing TailwindCSS globals import. Replace the body contents:

```tsx
import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Imago — Card Collection Manager",
  description: "Manage your sports card collection",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

**Step 6: Create placeholder pages**

Create `src/app/page.tsx` (Dashboard — replace default):

```tsx
export default function DashboardPage() {
  return <h1 className="text-2xl font-bold">Dashboard</h1>;
}
```

Create `src/app/collection/page.tsx`:

```tsx
export default function CollectionPage() {
  return <h1 className="text-2xl font-bold">Collection</h1>;
}
```

Create `src/app/collection/[id]/page.tsx`:

```tsx
export default function CardDetailPage() {
  return <h1 className="text-2xl font-bold">Card Detail</h1>;
}
```

Create `src/app/add/page.tsx`:

```tsx
export default function AddCardPage() {
  return <h1 className="text-2xl font-bold">Add Card</h1>;
}
```

**Step 7: Run all tests + verify build**

```bash
bunx vitest run && bun run build
```

Expected: All pass, build succeeds.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add app layout with navigation and placeholder pages"
```

---

## Task 7: Add Card Page

**Files:**
- Create: `src/components/CardForm.tsx`
- Create: `src/components/ImageUpload.tsx`
- Create: `src/components/__tests__/CardForm.test.tsx`
- Modify: `src/app/add/page.tsx`

This is the largest UI task. The form has a multi-step feel but is implemented as a single page with sections that expand as you progress.

**Step 1: Write failing test for CardForm**

Create `src/components/__tests__/CardForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardForm } from "@/components/CardForm";

describe("CardForm", () => {
  it("should render required fields", () => {
    render(<CardForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/player name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/year/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/brand/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/set/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
  });

  it("should render metadata fields", () => {
    render(<CardForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/purchase price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it("should call onSubmit with form data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CardForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/player name/i), "Mike Trout");
    await user.type(screen.getByLabelText(/year/i), "2023");
    await user.type(screen.getByLabelText(/brand/i), "Topps");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        playerName: "Mike Trout",
        year: 2023,
        brand: "Topps",
      }),
    );
  });

  it("should show validation error when playerName is empty", async () => {
    const user = userEvent.setup();
    render(<CardForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByText(/player name is required/i)).toBeInTheDocument();
  });

  it("should accept initial values for pre-filling", () => {
    render(
      <CardForm
        onSubmit={vi.fn()}
        initialValues={{ playerName: "Ohtani", year: 2024, brand: "Topps" }}
      />,
    );

    expect(screen.getByLabelText(/player name/i)).toHaveValue("Ohtani");
    expect(screen.getByLabelText(/year/i)).toHaveValue(2024);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bunx vitest run src/components/__tests__/CardForm.test.tsx
```

Expected: FAIL.

**Step 3: Implement ImageUpload component**

Create `src/components/ImageUpload.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";

interface ImageUploadProps {
  label: string;
  onUpload: (path: string) => void;
  currentImage?: string;
}

export function ImageUpload({ label, onUpload, currentImage }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setPreview(URL.createObjectURL(file));
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/images", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Upload failed");
        }

        const { path } = await response.json();
        onUpload(path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUpload],
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">
        {preview && (
          <img
            src={preview}
            alt={label}
            className="mb-2 h-48 w-auto rounded-lg object-contain"
          />
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
        />
        {uploading && <p className="mt-1 text-sm text-gray-500">Uploading...</p>}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
```

**Step 4: Implement CardForm component**

Create `src/components/CardForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ImageUpload } from "./ImageUpload";

interface CardFormData {
  playerName: string;
  year?: number;
  brand?: string;
  setName?: string;
  cardNumber?: string;
  team?: string;
  sport: string;
  variant?: string;
  condition?: string;
  graded: boolean;
  gradeCompany?: string;
  gradeValue?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  purchaseSource?: string;
  location?: string;
  imageFront?: string;
  imageBack?: string;
  notes?: string;
  tags: string[];
}

interface CardFormProps {
  onSubmit: (data: CardFormData) => void;
  initialValues?: Partial<CardFormData>;
  submitting?: boolean;
}

export function CardForm({ onSubmit, initialValues, submitting }: CardFormProps) {
  const [formData, setFormData] = useState<CardFormData>({
    playerName: initialValues?.playerName ?? "",
    year: initialValues?.year,
    brand: initialValues?.brand ?? "",
    setName: initialValues?.setName ?? "",
    cardNumber: initialValues?.cardNumber ?? "",
    team: initialValues?.team ?? "",
    sport: initialValues?.sport ?? "baseball",
    variant: initialValues?.variant ?? "",
    condition: initialValues?.condition ?? "",
    graded: initialValues?.graded ?? false,
    gradeCompany: initialValues?.gradeCompany ?? "",
    gradeValue: initialValues?.gradeValue,
    purchasePrice: initialValues?.purchasePrice,
    purchaseDate: initialValues?.purchaseDate ?? "",
    purchaseSource: initialValues?.purchaseSource ?? "",
    location: initialValues?.location ?? "",
    imageFront: initialValues?.imageFront ?? "",
    imageBack: initialValues?.imageBack ?? "",
    notes: initialValues?.notes ?? "",
    tags: initialValues?.tags ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState("");

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.playerName.trim()) {
      newErrors.playerName = "Player name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  }

  function updateField<K extends keyof CardFormData>(key: K, value: CardFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      updateField("tags", [...formData.tags, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    updateField("tags", formData.tags.filter((t) => t !== tag));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Image Upload Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Card Images</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageUpload
            label="Front"
            onUpload={(path) => updateField("imageFront", path)}
            currentImage={formData.imageFront || undefined}
          />
          <ImageUpload
            label="Back (optional)"
            onUpload={(path) => updateField("imageBack", path)}
            currentImage={formData.imageBack || undefined}
          />
        </div>
      </section>

      {/* Card Identity Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Card Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700">
              Player Name
            </label>
            <input
              id="playerName"
              type="text"
              value={formData.playerName}
              onChange={(e) => updateField("playerName", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {errors.playerName && (
              <p className="mt-1 text-sm text-red-600">{errors.playerName}</p>
            )}
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700">
              Year
            </label>
            <input
              id="year"
              type="number"
              value={formData.year ?? ""}
              onChange={(e) => updateField("year", e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
              Brand
            </label>
            <input
              id="brand"
              type="text"
              value={formData.brand}
              onChange={(e) => updateField("brand", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="setName" className="block text-sm font-medium text-gray-700">
              Set
            </label>
            <input
              id="setName"
              type="text"
              value={formData.setName}
              onChange={(e) => updateField("setName", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">
              Card Number
            </label>
            <input
              id="cardNumber"
              type="text"
              value={formData.cardNumber}
              onChange={(e) => updateField("cardNumber", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="team" className="block text-sm font-medium text-gray-700">
              Team
            </label>
            <input
              id="team"
              type="text"
              value={formData.team}
              onChange={(e) => updateField("team", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="sport" className="block text-sm font-medium text-gray-700">
              Sport
            </label>
            <select
              id="sport"
              value={formData.sport}
              onChange={(e) => updateField("sport", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="baseball">Baseball</option>
              <option value="hockey">Hockey</option>
            </select>
          </div>

          <div>
            <label htmlFor="variant" className="block text-sm font-medium text-gray-700">
              Variant
            </label>
            <input
              id="variant"
              type="text"
              value={formData.variant}
              onChange={(e) => updateField("variant", e.target.value)}
              placeholder="e.g., Refractor, Gold, Base"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </section>

      {/* Condition & Grading Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Condition</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
              Condition
            </label>
            <select
              id="condition"
              value={formData.condition}
              onChange={(e) => updateField("condition", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">—</option>
              <option value="Mint">Mint</option>
              <option value="Near Mint">Near Mint</option>
              <option value="Excellent">Excellent</option>
              <option value="Very Good">Very Good</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>

          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.graded}
                onChange={(e) => updateField("graded", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Graded</span>
            </label>
          </div>

          {formData.graded && (
            <>
              <div>
                <label htmlFor="gradeCompany" className="block text-sm font-medium text-gray-700">
                  Grading Company
                </label>
                <select
                  id="gradeCompany"
                  value={formData.gradeCompany}
                  onChange={(e) => updateField("gradeCompany", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">—</option>
                  <option value="PSA">PSA</option>
                  <option value="BGS">BGS</option>
                  <option value="SGC">SGC</option>
                  <option value="CGC">CGC</option>
                </select>
              </div>
              <div>
                <label htmlFor="gradeValue" className="block text-sm font-medium text-gray-700">
                  Grade
                </label>
                <input
                  id="gradeValue"
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={formData.gradeValue ?? ""}
                  onChange={(e) => updateField("gradeValue", e.target.value ? Number(e.target.value) : undefined)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Purchase & Location Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Purchase & Location</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">
              Purchase Price
            </label>
            <input
              id="purchasePrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.purchasePrice ?? ""}
              onChange={(e) => updateField("purchasePrice", e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">
              Purchase Date
            </label>
            <input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => updateField("purchaseDate", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="purchaseSource" className="block text-sm font-medium text-gray-700">
              Source
            </label>
            <input
              id="purchaseSource"
              type="text"
              value={formData.purchaseSource}
              onChange={(e) => updateField("purchaseSource", e.target.value)}
              placeholder="eBay, LCS, show, break..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g., Box 3"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </section>

      {/* Tags & Notes Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Tags & Notes</h2>

        <div>
          <label htmlFor="tagInput" className="block text-sm font-medium text-gray-700">
            Tags
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="tagInput"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Type a tag and press Enter"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Add
            </button>
          </div>
          {formData.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save Card"}
      </button>
    </form>
  );
}
```

**Step 5: Run tests to verify they pass**

```bash
bunx vitest run src/components/__tests__/CardForm.test.tsx
```

Expected: All PASS.

**Step 6: Wire up Add Card page**

Modify `src/app/add/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CardForm } from "@/components/CardForm";

export default function AddCardPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Failed to save card");
      }

      const card = await response.json();
      router.push(`/collection/${card.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Card</h1>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <CardForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
```

**Step 7: Run all tests + build**

```bash
bunx vitest run && bun run build
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add card form with image upload, validation, and all metadata fields"
```

---

## Task 8: Collection Browser Page

**Files:**
- Create: `src/components/CardGallery.tsx`
- Create: `src/components/CardTable.tsx`
- Create: `src/components/CollectionFilters.tsx`
- Create: `src/components/__tests__/CardGallery.test.tsx`
- Modify: `src/app/collection/page.tsx`

**Step 1: Write failing test for CardGallery**

Create `src/components/__tests__/CardGallery.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardGallery } from "@/components/CardGallery";

const mockCards = [
  {
    id: "1",
    playerName: "Mike Trout",
    year: 2023,
    brand: "Topps",
    setName: "Chrome",
    imageFront: "/uploads/trout.jpg",
    sport: "baseball",
  },
  {
    id: "2",
    playerName: "Shohei Ohtani",
    year: 2023,
    brand: "Topps",
    setName: "Chrome",
    imageFront: null,
    sport: "baseball",
  },
];

describe("CardGallery", () => {
  it("should render a card for each entry", () => {
    render(<CardGallery cards={mockCards as any} />);

    expect(screen.getByText("Mike Trout")).toBeInTheDocument();
    expect(screen.getByText("Shohei Ohtani")).toBeInTheDocument();
  });

  it("should show placeholder when no image", () => {
    render(<CardGallery cards={mockCards as any} />);

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(1); // Only Trout has an image
  });

  it("should show empty state when no cards", () => {
    render(<CardGallery cards={[]} />);

    expect(screen.getByText(/no cards found/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bunx vitest run src/components/__tests__/CardGallery.test.tsx
```

**Step 3: Implement CardGallery**

Create `src/components/CardGallery.tsx`:

```tsx
import Link from "next/link";
import type { Card } from "@/db/schema";

interface CardGalleryProps {
  cards: Card[];
}

export function CardGallery({ cards }: CardGalleryProps) {
  if (cards.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No cards found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => (
        <Link
          key={card.id}
          href={`/collection/${card.id}`}
          className="group rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition hover:shadow-md"
        >
          <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded bg-gray-100">
            {card.imageFront ? (
              <img
                src={card.imageFront}
                alt={`${card.playerName} ${card.year} ${card.brand} ${card.setName}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                No image
              </div>
            )}
          </div>
          <div className="mt-2">
            <p className="truncate text-sm font-medium text-gray-900">{card.playerName}</p>
            <p className="truncate text-xs text-gray-500">
              {[card.year, card.brand, card.setName].filter(Boolean).join(" ")}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

**Step 4: Implement CardTable**

Create `src/components/CardTable.tsx`:

```tsx
import Link from "next/link";
import type { Card } from "@/db/schema";

interface CardTableProps {
  cards: Card[];
}

export function CardTable({ cards }: CardTableProps) {
  if (cards.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No cards found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Player</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Year</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Set</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">#</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Variant</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Price</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Location</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {cards.map((card) => (
            <tr key={card.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link href={`/collection/${card.id}`} className="font-medium text-blue-600 hover:underline">
                  {card.playerName}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{card.year}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {[card.brand, card.setName].filter(Boolean).join(" ")}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{card.cardNumber}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{card.variant}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {card.purchasePrice != null ? `$${card.purchasePrice.toFixed(2)}` : "—"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{card.location ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 5: Implement CollectionFilters**

Create `src/components/CollectionFilters.tsx`:

```tsx
"use client";

interface FiltersState {
  sport: string;
  location: string;
  brand: string;
  yearFrom: string;
  yearTo: string;
  graded: string;
  q: string;
}

interface CollectionFiltersProps {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
}

export function CollectionFilters({ filters, onChange }: CollectionFiltersProps) {
  function update(key: keyof FiltersState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <input
          type="text"
          placeholder="Search cards..."
          value={filters.q}
          onChange={(e) => update("q", e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Sport</label>
        <select
          value={filters.sport}
          onChange={(e) => update("sport", e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        >
          <option value="">All</option>
          <option value="baseball">Baseball</option>
          <option value="hockey">Hockey</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Location</label>
        <input
          type="text"
          value={filters.location}
          onChange={(e) => update("location", e.target.value)}
          placeholder="e.g., Box 3"
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Brand</label>
        <input
          type="text"
          value={filters.brand}
          onChange={(e) => update("brand", e.target.value)}
          placeholder="e.g., Topps"
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Graded</label>
        <select
          value={filters.graded}
          onChange={(e) => update("graded", e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        >
          <option value="">All</option>
          <option value="true">Graded only</option>
          <option value="false">Raw only</option>
        </select>
      </div>
    </div>
  );
}
```

**Step 6: Wire up collection page**

Modify `src/app/collection/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { CardGallery } from "@/components/CardGallery";
import { CardTable } from "@/components/CardTable";
import { CollectionFilters } from "@/components/CollectionFilters";
import type { Card } from "@/db/schema";

type ViewMode = "gallery" | "list";

export default function CollectionPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sport: "",
    location: "",
    brand: "",
    yearFrom: "",
    yearTo: "",
    graded: "",
    q: "",
  });

  const fetchCards = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.sport) params.set("sport", filters.sport);
    if (filters.location) params.set("location", filters.location);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.graded) params.set("graded", filters.graded);

    const response = await fetch(`/api/cards?${params}`);
    const data = await response.json();
    setCards(data);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Collection</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("gallery")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === "gallery" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Gallery
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <CollectionFilters filters={filters} onChange={setFilters} />
        </aside>

        <div>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : viewMode === "gallery" ? (
            <CardGallery cards={cards} />
          ) : (
            <CardTable cards={cards} />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 7: Run tests + build**

```bash
bunx vitest run && bun run build
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add collection browser with gallery/list views and filtering"
```

---

## Task 9: Card Detail / Edit Page

**Files:**
- Modify: `src/app/collection/[id]/page.tsx`
- Reuses: `CardForm` component from Task 7

**Step 1: Implement the card detail page**

Modify `src/app/collection/[id]/page.tsx`:

```tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CardForm } from "@/components/CardForm";
import type { Card } from "@/db/schema";

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/cards/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Card not found");
        return res.json();
      })
      .then(setCard)
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleUpdate(data: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Update failed");
      const updated = await response.json();
      setCard(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      const response = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      router.push("/collection");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (error && !card) {
    return <div className="py-12 text-center text-red-600">{error}</div>;
  }

  if (!card) {
    return <div className="py-12 text-center text-gray-500">Loading...</div>;
  }

  if (editing) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit Card</h1>
          <button
            onClick={() => setEditing(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
        <CardForm onSubmit={handleUpdate} initialValues={card} submitting={submitting} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{card.playerName}</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Are you sure you want to delete this card? This cannot be undone.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleDelete}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-4">
          {card.imageFront ? (
            <img
              src={card.imageFront}
              alt={`${card.playerName} front`}
              className="w-full rounded-lg"
            />
          ) : (
            <div className="flex aspect-[2.5/3.5] items-center justify-center rounded-lg bg-gray-100 text-gray-400">
              No front image
            </div>
          )}
          {card.imageBack && (
            <img
              src={card.imageBack}
              alt={`${card.playerName} back`}
              className="w-full rounded-lg"
            />
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-medium text-gray-500">Card Details</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-sm text-gray-500">Year</dt>
              <dd className="text-sm text-gray-900">{card.year ?? "—"}</dd>
              <dt className="text-sm text-gray-500">Brand</dt>
              <dd className="text-sm text-gray-900">{card.brand ?? "—"}</dd>
              <dt className="text-sm text-gray-500">Set</dt>
              <dd className="text-sm text-gray-900">{card.setName ?? "—"}</dd>
              <dt className="text-sm text-gray-500">Number</dt>
              <dd className="text-sm text-gray-900">{card.cardNumber ?? "—"}</dd>
              <dt className="text-sm text-gray-500">Team</dt>
              <dd className="text-sm text-gray-900">{card.team ?? "—"}</dd>
              <dt className="text-sm text-gray-500">Sport</dt>
              <dd className="text-sm text-gray-900">{card.sport}</dd>
              <dt className="text-sm text-gray-500">Variant</dt>
              <dd className="text-sm text-gray-900">{card.variant ?? "—"}</dd>
            </dl>
          </section>

          <section>
            <h2 className="text-sm font-medium text-gray-500">Condition</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-sm text-gray-500">Condition</dt>
              <dd className="text-sm text-gray-900">{card.condition ?? "—"}</dd>
              <dt className="text-sm text-gray-500">Graded</dt>
              <dd className="text-sm text-gray-900">
                {card.graded ? `${card.gradeCompany} ${card.gradeValue}` : "Raw"}
              </dd>
            </dl>
          </section>

          <section>
            <h2 className="text-sm font-medium text-gray-500">Purchase & Location</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-sm text-gray-500">Price</dt>
              <dd className="text-sm text-gray-900">
                {card.purchasePrice != null ? `$${card.purchasePrice.toFixed(2)}` : "—"}
              </dd>
              <dt className="text-sm text-gray-500">Date</dt>
              <dd className="text-sm text-gray-900">{card.purchaseDate ?? "—"}</dd>
              <dt className="text-sm text-gray-500">Source</dt>
              <dd className="text-sm text-gray-900">{card.purchaseSource ?? "—"}</dd>
              <dt className="text-sm text-gray-500">Location</dt>
              <dd className="text-sm text-gray-900">{card.location ?? "—"}</dd>
            </dl>
          </section>

          {card.tags && (card.tags as string[]).length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-gray-500">Tags</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {(card.tags as string[]).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {card.notes && (
            <section>
              <h2 className="text-sm font-medium text-gray-500">Notes</h2>
              <p className="mt-2 text-sm text-gray-900">{card.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Run tests + build**

```bash
bunx vitest run && bun run build
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add card detail page with edit and delete"
```

---

## Task 10: Dashboard Page

**Files:**
- Create: `src/app/api/stats/route.ts`
- Modify: `src/app/page.tsx`

**Step 1: Write failing test for stats query**

Create `src/db/__tests__/stats.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { createCard } from "@/db/cards";
import { getCollectionStats } from "@/db/stats";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

describe("getCollectionStats", () => {
  it("should return zero stats for empty collection", () => {
    const db = freshDb();
    const stats = getCollectionStats(db);

    expect(stats.totalCards).toBe(0);
    expect(stats.totalInvested).toBe(0);
    expect(stats.bySport).toEqual({});
    expect(stats.byLocation).toEqual({});
  });

  it("should calculate stats correctly", () => {
    const db = freshDb();
    createCard(db, { playerName: "Trout", sport: "baseball", purchasePrice: 25, location: "Box 1" });
    createCard(db, { playerName: "Ohtani", sport: "baseball", purchasePrice: 50, location: "Box 2" });
    createCard(db, { playerName: "McDavid", sport: "hockey", purchasePrice: 30, location: "Box 1" });

    const stats = getCollectionStats(db);

    expect(stats.totalCards).toBe(3);
    expect(stats.totalInvested).toBe(105);
    expect(stats.bySport).toEqual({ baseball: 2, hockey: 1 });
    expect(stats.byLocation).toEqual({ "Box 1": 2, "Box 2": 1 });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bunx vitest run src/db/__tests__/stats.test.ts
```

**Step 3: Implement stats query**

Create `src/db/stats.ts`:

```typescript
import { sql } from "drizzle-orm";
import { cards } from "./schema";

interface CollectionStats {
  totalCards: number;
  totalInvested: number;
  bySport: Record<string, number>;
  byLocation: Record<string, number>;
}

type DrizzleDb = ReturnType<typeof import("./index").getDb>;

export function getCollectionStats(db: DrizzleDb): CollectionStats {
  const allCards = db.select().from(cards).all();

  const totalCards = allCards.length;
  const totalInvested = allCards.reduce((sum, c) => sum + (c.purchasePrice ?? 0), 0);

  const bySport: Record<string, number> = {};
  const byLocation: Record<string, number> = {};

  for (const card of allCards) {
    bySport[card.sport] = (bySport[card.sport] ?? 0) + 1;
    if (card.location) {
      byLocation[card.location] = (byLocation[card.location] ?? 0) + 1;
    }
  }

  return { totalCards, totalInvested, bySport, byLocation };
}
```

**Step 4: Run test to verify it passes**

```bash
bunx vitest run src/db/__tests__/stats.test.ts
```

**Step 5: Create stats API route**

Create `src/app/api/stats/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCollectionStats } from "@/db/stats";

export async function GET() {
  const db = getDb();
  const stats = getCollectionStats(db);
  return NextResponse.json(stats);
}
```

**Step 6: Implement Dashboard page**

Modify `src/app/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Card } from "@/db/schema";

interface Stats {
  totalCards: number;
  totalInvested: number;
  bySport: Record<string, number>;
  byLocation: Record<string, number>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCards, setRecentCards] = useState<Card[]>([]);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
    fetch("/api/cards?sortBy=createdAt&sortOrder=desc")
      .then((r) => r.json())
      .then((cards) => setRecentCards(cards.slice(0, 8)));
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/add"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          Add Card
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Cards</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCards}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Invested</p>
            <p className="text-2xl font-bold text-gray-900">${stats.totalInvested.toFixed(2)}</p>
          </div>
          {Object.entries(stats.bySport).map(([sport, count]) => (
            <div key={sport} className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-sm capitalize text-gray-500">{sport}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Cards */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recently Added</h2>
        {recentCards.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-sm">
            <p>No cards yet. Add your first card to get started!</p>
            <Link
              href="/add"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Add Card
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentCards.map((card) => (
              <Link
                key={card.id}
                href={`/collection/${card.id}`}
                className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm hover:shadow-md"
              >
                <div className="aspect-[2.5/3.5] overflow-hidden rounded bg-gray-100">
                  {card.imageFront ? (
                    <img src={card.imageFront} alt={card.playerName} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{card.playerName}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

**Step 7: Run all tests + build**

```bash
bunx vitest run && bun run build
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add dashboard with collection stats and recent cards"
```

---

## Task 11: JunkWaxHero Reference Data

**Files:**
- Create: `src/db/reference-schema.ts`
- Create: `scripts/seed-reference-data.ts`
- Create: `src/app/api/cards/search/route.ts`

This task downloads the JunkWaxHero CardLists repo, parses the JSON files, and seeds them into a reference table for autocomplete.

**Step 1: Write failing test for reference data search**

Create `src/db/__tests__/reference.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { searchReferenceCards } from "@/db/reference";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function freshDb() {
  const db = getDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

describe("searchReferenceCards", () => {
  it("should return empty array when no reference data exists", () => {
    const db = freshDb();
    const results = searchReferenceCards(db, "trout");
    expect(results).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bunx vitest run src/db/__tests__/reference.test.ts
```

**Step 3: Add reference cards schema**

Create `src/db/reference-schema.ts`:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const referenceCards = sqliteTable("reference_cards", {
  id: text("id").primaryKey(),
  playerName: text("player_name").notNull(),
  year: integer("year"),
  brand: text("brand"),
  setName: text("set_name"),
  cardNumber: text("card_number"),
  sport: text("sport").notNull(),
  subset: text("subset"),
  attributes: text("attributes"),
});
```

Add this table to `src/db/schema.ts` by re-exporting:

```typescript
export { referenceCards } from "./reference-schema";
```

Then regenerate migrations:

```bash
bunx drizzle-kit generate
```

**Step 4: Implement reference search**

Create `src/db/reference.ts`:

```typescript
import { like, or } from "drizzle-orm";
import { referenceCards } from "./reference-schema";

type DrizzleDb = ReturnType<typeof import("./index").getDb>;

interface ReferenceCard {
  id: string;
  playerName: string;
  year: number | null;
  brand: string | null;
  setName: string | null;
  cardNumber: string | null;
  sport: string;
  subset: string | null;
}

export function searchReferenceCards(
  db: DrizzleDb,
  query: string,
  limit = 20,
): ReferenceCard[] {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(referenceCards)
    .where(
      or(
        like(referenceCards.playerName, pattern),
        like(referenceCards.setName, pattern),
        like(referenceCards.brand, pattern),
      ),
    )
    .limit(limit)
    .all();
}
```

**Step 5: Run test to verify it passes**

```bash
bunx vitest run src/db/__tests__/reference.test.ts
```

**Step 6: Create seed script**

Create `scripts/seed-reference-data.ts`. This script will:
1. Clone the JunkWaxHero CardLists repo (shallow clone)
2. Walk the directory structure
3. Parse each JSON file
4. Insert records into the reference_cards table

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { referenceCards } from "../src/db/reference-schema";
import { v4 as uuid } from "uuid";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const REPO_URL = "https://github.com/JunkWaxHero/CardLists.git";
const CLONE_DIR = "./tmp/CardLists";
const DB_PATH = "./imago.db";

// Clone repo if not already present
if (!existsSync(CLONE_DIR)) {
  console.log("Cloning JunkWaxHero CardLists...");
  execSync(`git clone --depth 1 ${REPO_URL} ${CLONE_DIR}`, { stdio: "inherit" });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle" });

// Walk sport directories
const sports = ["baseball", "hockey"];
let totalInserted = 0;

for (const sport of sports) {
  const sportDir = join(CLONE_DIR, sport);
  if (!existsSync(sportDir)) {
    console.log(`No ${sport} directory found, skipping.`);
    continue;
  }

  const yearDirs = readdirSync(sportDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const yearDir of yearDirs) {
    const yearPath = join(sportDir, yearDir);
    const jsonFiles = readdirSync(yearPath).filter((f) => f.endsWith(".json"));

    for (const jsonFile of jsonFiles) {
      try {
        const content = readFileSync(join(yearPath, jsonFile), "utf-8");
        const data = JSON.parse(content);
        const year = parseInt(yearDir, 10) || null;
        const brand = data.name ?? jsonFile.replace(".json", "").replace(`${yearDir}-`, "");

        if (!data.sets) continue;

        for (const set of data.sets) {
          if (!set.cards) continue;

          for (const card of set.cards) {
            db.insert(referenceCards)
              .values({
                id: uuid(),
                playerName: card.name ?? "Unknown",
                year,
                brand,
                setName: set.name ?? brand,
                cardNumber: card.number ?? null,
                sport,
                subset: set.name !== brand ? set.name : null,
                attributes: card.attributes ? JSON.stringify(card.attributes) : null,
              })
              .run();
            totalInserted++;
          }
        }
      } catch (err) {
        console.error(`Error processing ${jsonFile}:`, err);
      }
    }
  }

  console.log(`Finished ${sport}`);
}

console.log(`Seeded ${totalInserted} reference cards.`);
sqlite.close();
```

Add a script to `package.json`:

```json
"scripts": {
  "seed": "bun run scripts/seed-reference-data.ts"
}
```

**Step 7: Implement search API route**

Create `src/app/api/cards/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { searchReferenceCards } from "@/db/reference";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const db = getDb();
  const results = searchReferenceCards(db, query);
  return NextResponse.json(results);
}
```

**Step 8: Run all tests + build**

```bash
bunx vitest run && bun run build
```

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add JunkWaxHero reference data seeding and search API"
```

---

## Task 12: CardSight AI Integration (Interface Only)

**Files:**
- Create: `src/lib/card-identifier.ts`
- Create: `src/lib/__tests__/card-identifier.test.ts`
- Create: `src/app/api/identify/route.ts`

Since the CardSight AI API docs are behind authentication, this task creates a clean interface and a placeholder implementation. When you sign up and get API access, you only need to implement the `identifyCard` function body.

**Step 1: Write failing test for card identifier interface**

Create `src/lib/__tests__/card-identifier.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { CardIdentificationResult } from "@/lib/card-identifier";
import { isIdentificationAvailable } from "@/lib/card-identifier";

describe("card identifier", () => {
  it("should report unavailable when no API key is configured", () => {
    const available = isIdentificationAvailable();
    // Without CARDSIGHT_API_KEY env var, should be unavailable
    expect(available).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bunx vitest run src/lib/__tests__/card-identifier.test.ts
```

**Step 3: Implement card identifier module**

Create `src/lib/card-identifier.ts`:

```typescript
export interface CardIdentificationResult {
  playerName: string;
  year?: number;
  brand?: string;
  setName?: string;
  cardNumber?: string;
  team?: string;
  variant?: string;
  confidence?: number;
}

export function isIdentificationAvailable(): boolean {
  return !!process.env.CARDSIGHT_API_KEY;
}

export async function identifyCard(
  imageBuffer: Buffer,
): Promise<CardIdentificationResult | null> {
  const apiKey = process.env.CARDSIGHT_API_KEY;
  if (!apiKey) {
    return null;
  }

  // TODO: Implement CardSight AI API call once API docs are available.
  // Expected flow:
  // 1. POST image to CardSight API endpoint
  // 2. Parse response for card details
  // 3. Return as CardIdentificationResult
  //
  // Sign up at https://cardsight.ai/ to get API key.
  // Set CARDSIGHT_API_KEY in .env.local

  return null;
}
```

**Step 4: Run test to verify it passes**

```bash
bunx vitest run src/lib/__tests__/card-identifier.test.ts
```

**Step 5: Implement identify API route**

Create `src/app/api/identify/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { identifyCard, isIdentificationAvailable } from "@/lib/card-identifier";

export async function POST(request: NextRequest) {
  if (!isIdentificationAvailable()) {
    return NextResponse.json(
      { error: "Card identification is not configured. Set CARDSIGHT_API_KEY in .env.local" },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await identifyCard(buffer);

  if (!result) {
    return NextResponse.json(
      { error: "Could not identify card. Try manual entry." },
      { status: 422 },
    );
  }

  return NextResponse.json(result);
}
```

**Step 6: Run all tests + build**

```bash
bunx vitest run && bun run build
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add CardSight AI identification interface (ready for API key)"
```

---

## Task 13: Final Polish + Verification

**Step 1: Create .env.example**

Create `.env.example`:

```
# Optional: CardSight AI API key for photo-based card identification
# Sign up at https://cardsight.ai/
CARDSIGHT_API_KEY=
```

**Step 2: Run full test suite**

```bash
bunx vitest run
```

Expected: All tests pass.

**Step 3: Run build**

```bash
bun run build
```

Expected: Build succeeds.

**Step 4: Manual smoke test**

```bash
bun run dev
```

Verify in browser:
- Dashboard loads at `/`
- Collection page loads at `/collection`
- Add Card form works at `/add`
- Can create a card (without image — just fill form and save)
- Card appears in collection
- Card detail page works
- Edit and delete work

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add env example and complete v1 MVP"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding | Root config files |
| 2 | Database schema + connection | `src/db/schema.ts`, `src/db/index.ts` |
| 3 | Cards data layer (CRUD) | `src/db/cards.ts` |
| 4 | Cards API routes | `src/app/api/cards/` |
| 5 | Image upload API | `src/app/api/images/`, `src/lib/images.ts` |
| 6 | Layout + navigation | `src/components/NavBar.tsx`, `src/app/layout.tsx` |
| 7 | Add Card page + form | `src/components/CardForm.tsx`, `src/app/add/` |
| 8 | Collection browser | `src/components/CardGallery.tsx`, `src/app/collection/` |
| 9 | Card detail / edit | `src/app/collection/[id]/` |
| 10 | Dashboard | `src/db/stats.ts`, `src/app/page.tsx` |
| 11 | JunkWaxHero reference data | `scripts/seed-reference-data.ts`, `src/db/reference.ts` |
| 12 | CardSight AI interface | `src/lib/card-identifier.ts`, `src/app/api/identify/` |
| 13 | Final polish + verification | `.env.example`, smoke tests |
