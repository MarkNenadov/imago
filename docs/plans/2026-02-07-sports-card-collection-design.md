# Imago: Sports Card Collection Manager — Design Document

## Overview

A personal sports card collection manager built as a Next.js web app. Photo-first workflow: snap a picture of a card, auto-identify it via AI, then add your metadata (price, location, notes). Local-first architecture with a clear path to deployment later.

## Problem

Managing a 100-500 card collection (baseball primarily, hockey coming) stored in top loaders in boxes. A spreadsheet falls short on image management, API lookups, and visual browsing. A custom app earns its keep by automating card identification and providing rich search/filter/browse capabilities.

## Data Model

```
Card
├── id                 (auto-generated UUID)
├── playerName         "Mike Trout"
├── year               2023
├── brand              "Topps"
├── setName            "Chrome"
├── cardNumber         "42"
├── team               "Angels"
├── sport              "baseball" | "hockey"
├── variant            "Refractor" (parallel, insert, base, etc.)
├── condition          "Near Mint" (subjective assessment for raw cards)
├── graded             false
├── gradeCompany       null (PSA, BGS, SGC)
├── gradeValue         null (10, 9.5, etc.)
├── purchasePrice      12.50
├── purchaseDate       "2024-03-15"
├── purchaseSource     "eBay" (where it was bought)
├── location           "Box 3"
├── imageFront         "/uploads/card-abc-front.jpg"
├── imageBack          "/uploads/card-abc-back.jpg" (optional)
├── notes              "Great centering, PC card"
├── tags               ["PC", "rookie", "numbered /250"]
├── createdAt          (auto-generated)
├── updatedAt          (auto-generated)
```

Key decisions:
- `variant` captures parallels/inserts — critical for identity and value
- `tags` is a flexible array for anything (PC, rookie, auto, numbered, etc.)
- `graded` fields are separate from `condition` — slabbed cards get grade info, raw cards get subjective condition
- `location` is a simple string — "Box 3" is enough for top-loader-in-box storage
- `purchaseSource` tracks provenance (eBay, LCS, show, break, etc.)

## Core Workflows

### Adding a Card (Photo-First)

1. Tap/click "Add Card"
2. Snap or upload a photo of the front of the card
3. App sends the photo to CardSight AI -> gets back player, year, set, card number, variant
4. Pre-filled form appears with identified details. Confirm or correct.
5. Fill in personal metadata: purchase price, date, source, location, condition, tags, notes
6. Optionally snap the back of the card
7. Save

**Fallback**: If API quota is exhausted or identification fails, switch to manual entry with autocomplete powered by the local JunkWaxHero card list data.

### Browsing & Searching

- **Gallery view**: Grid of card images for visual browsing
- **List view**: Table with sortable columns (player, year, set, price, location)
- **Filters**: Sport, year range, brand/set, location, tags, graded/raw
- **Search**: Free-text across player name, set, notes, tags
- **Sort**: Date added, purchase price, player name, year

### Editing & Managing

- Click any card for full detail view with both images
- Edit any field inline
- Move cards between boxes (update location)
- Delete with confirmation

## Architecture

```
┌─────────────────────────────────────────┐
│             Next.js App                 │
│                                         │
│  ┌──────────┐    ┌───────────────────┐  │
│  │  React UI │    │  API Routes       │  │
│  │  (pages)  │───>│  /api/cards       │  │
│  │           │    │  /api/identify    │  │
│  │  Tailwind │    │  /api/images      │  │
│  └──────────┘    └───────┬───────────┘  │
│                          │              │
│              ┌───────────┼──────────┐   │
│              v           v          v   │
│         ┌────────┐ ┌──────────┐ ┌─────┐│
│         │ SQLite │ │ CardSight│ │Local││
│         │ (DB)   │ │   API    │ │Files││
│         └────────┘ └──────────┘ └─────┘│
│              ^                          │
│         ┌────────────┐                  │
│         │ JunkWaxHero│                  │
│         │ Card Lists │                  │
│         │ (seed data)│                  │
│         └────────────┘                  │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer          | Technology                  | Why                                              |
|----------------|-----------------------------|--------------------------------------------------|
| Framework      | Next.js 15 (App Router)     | Preferred framework, SSR + API routes in one      |
| Runtime        | Bun                         | Preferred over npm/yarn                           |
| Styling        | TailwindCSS                 | Preferred for styling                             |
| Database       | SQLite via better-sqlite3   | Zero setup, single file, easy backup              |
| ORM            | Drizzle ORM                 | Type-safe, lightweight, trivial migration to PG   |
| Card ID API    | CardSight AI                | 750 free calls/month, 5M+ card catalog            |
| Card Data      | JunkWaxHero CardLists       | Free open-source JSON checklists for offline search |
| Testing        | Vitest + React Testing Lib  | Fast, works great with Next.js + Bun              |
| Images         | Local filesystem            | /public/uploads/ directory                        |

## API Routes

| Route              | Method | Purpose                                    |
|--------------------|--------|--------------------------------------------|
| `/api/cards`       | GET    | List/search/filter cards                   |
| `/api/cards`       | POST   | Create a new card                          |
| `/api/cards/[id]`  | GET    | Get single card details                    |
| `/api/cards/[id]`  | PUT    | Update a card                              |
| `/api/cards/[id]`  | DELETE | Delete a card                              |
| `/api/identify`    | POST   | Send image to CardSight AI, return results |
| `/api/images`      | POST   | Upload card image, return file path        |
| `/api/cards/search`| GET    | Search JunkWaxHero local data for autocomplete |

## UI Pages

### 1. Dashboard (Home) — `/`
- Collection stats: total cards, total invested, cards by sport, cards by box
- Recently added cards (last 5-10)
- Prominent "Add Card" button

### 2. Collection Browser — `/collection`
- Toggle: gallery view (image grid) / list view (table)
- Filter sidebar: sport, year range, brand, set, location, tags, graded/raw
- Search bar
- Sortable columns in list view
- Click card -> detail panel/modal

### 3. Card Detail / Edit — `/collection/[id]`
- Large card image(s): front and back
- All metadata displayed, inline-editable
- Delete button with confirmation

### 4. Add Card — `/add`
- Step 1: Upload/capture photo
- Step 2: Review identified details (or manually search/enter)
- Step 3: Add personal metadata (price, location, tags, notes)
- Step 4: Save

### Navigation
Simple top nav: Dashboard | Collection | Add Card

## External APIs

### CardSight AI
- **Purpose**: Photo-based card identification
- **Free tier**: 750 API calls/month
- **Data returned**: Player name, year, set, card number, variant, market pricing
- **Called from**: `/api/identify` (server-side, API key stays private)

### JunkWaxHero CardLists (GitHub)
- **Purpose**: Offline card lookup / autocomplete fallback
- **Cost**: Free, open-source (MIT)
- **Format**: Static JSON files organized by sport/year/set
- **Usage**: Downloaded at project setup, seeded into SQLite for fast querying

### PSA Public API (future consideration)
- **Purpose**: Verify graded card details by cert number
- **Free tier**: ~100 calls/day
- **Not in v1**: Could add a "scan slab" feature later

## Error Handling

- **CardSight API down/quota exceeded**: Graceful fallback to manual entry with local autocomplete. Clear message: "Photo identification unavailable — search manually"
- **Image upload fails**: Specific error, card can still be saved without image
- **Database errors**: Specific catch per operation, user-friendly messages
- **Invalid card data**: Form validation before save. Required fields: player name and at least one of (year, set, card number)

## Testing Strategy

- **Vitest** for unit and integration tests
- **React Testing Library** for component tests
- TDD: tests before implementation

What gets tested:
- Database CRUD operations and search/filter queries
- API routes (card creation, identification proxy, image upload)
- Card identification flow (mocked CardSight responses)
- Search and filter logic
- Form validation

## Deployment Path (Future)

When ready to deploy:
- SQLite -> Turso (SQLite-compatible hosted DB) or Postgres
- Local images -> Cloudflare R2 or S3
- Deploy to Vercel
- Add authentication if sharing read-only

## Explicitly Not in v1

- No authentication/login (local app)
- No price tracking over time (just purchase price)
- No read-only sharing link
- No bulk import/export
- No barcode scanning
- No collection value estimation

These can all be added later without rearchitecting.
