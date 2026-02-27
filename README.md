# Imago

A sports card collection management app for tracking baseball and hockey cards. 

Upload card images, auto-identify cards via AI (CardSight), browse and filter your collection, view statistics, and generate lot listings for selling.

Note: This app has no authentication currently, and is intended to be used locally only.

![image](https://github.com/MarkNenadov/imago/blob/main/screenshots/screenshot01.png)


## Features

- **Card Management** — Add cards with image upload, player details, purchase info, and tags
- **AI Card Identification** — Upload a card photo and auto-fill details via the [CardSight](https://cardsight.ai/) API
- **Collection Browser** — Filter by sport, team, brand, year, and tags. Sort by any column.
- **Dashboard** — At-a-glance stats (total cards, images, players, invested) and recently added cards
- **Statistics** — Breakdowns by team, year, brand, decade, entry date, rookie status, and position type
- **Tools**
  - **CSV Export** — Download your full collection as a spreadsheet
  - **Lot Builder** — Select cards, generate composite grid images and marketplace listing descriptions
  - **Tag Cleanup** — Backfill missing decade tags (1960s–1990s) and HOF tags automatically
  - **Data Audit** — Find cards missing important fields (price, condition, team, image, etc.)
- **Auto-tagging** — Cards from 1960–1999 automatically get their decade tag, and Baseball Hall of Famers get the HOF tag on creation

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router, Turbopack)
- [SQLite](https://www.sqlite.org/) via [Drizzle ORM](https://orm.drizzle.team/) + better-sqlite3
- [TailwindCSS](https://tailwindcss.com/) v4
- [Vitest](https://vitest.dev/) + React Testing Library
- [Sharp](https://sharp.pixelplumbing.com/) for image processing
- [Bun](https://bun.sh/) as the JavaScript runtime

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- Node.js 18+ (for Next.js compatibility)

### Install Dependencies

```bash
bun install
```

### Set Up the Database

Push the Drizzle schema to create the SQLite database:

```bash
bunx drizzle-kit push
```

This creates `imago.db` in the project root.

Optionally, seed reference data:

```bash
bun run seed
```

### Configure Environment (Optional)

Copy the example env file and add your API key:

```bash
cp .env.example .env
```

Edit `.env` and add your [CardSight](https://cardsight.ai/) API key to enable AI-powered card identification from uploaded photos. Sign up at [cardsight.ai](https://cardsight.ai/) to get a key — the free tier includes 750 lookups per month. The app works without it — you'll just fill in card details manually.

### Run the Dev Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to start managing your collection.

### Run Tests

```bash
bunx vitest run
```

### Build for Production

```bash
bun run build
bun start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/cards/          # CRUD endpoints for cards
│   ├── api/identify/       # CardSight AI identification
│   ├── api/images/         # Image upload
│   ├── api/stats/          # Collection statistics
│   ├── api/tools/          # CSV export, lot builder, tag cleanup, audit
│   ├── add/                # Add card form
│   ├── collection/         # Collection browser and card detail view
│   ├── statistics/         # Statistics charts
│   └── tools/              # Tools page (lot builder, CSV, cleanup, audit)
├── components/             # React components
├── db/                     # Drizzle schema, queries, and stats
├── lib/                    # Card identifier, image utils, team lists
└── test/                   # Test setup
drizzle/                    # Migration files
```

## License

MIT
