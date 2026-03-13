const CARDSIGHT_API_BASE = "https://api.cardsight.ai";
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const CONCURRENT_PAGES = 4;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface CatalogCard {
  playerName: string;
  year?: number;
  brand?: string;
  setName?: string;
  cardNumber?: string;
  variant?: string;
  rawPrice?: number;
}

export interface PriceMatchParams {
  year: number;
  brand: string;
  setName?: string;
  cardNumber?: string;
  variant?: string;
}

function findMatchingCard(cards: CatalogCard[], params: PriceMatchParams): CatalogCard | null {
  return cards.find((card) => {
    if (card.year !== params.year) return false;
    if (card.brand !== params.brand) return false;
    if (params.setName != null && card.setName !== params.setName) return false;
    if (params.cardNumber != null && card.cardNumber !== params.cardNumber) return false;
    if (params.variant != null && card.variant !== params.variant) return false;
    return true;
  }) ?? null;
}

export function findMatchingPrice(
  cards: CatalogCard[],
  params: PriceMatchParams,
): number | null {
  return findMatchingCard(cards, params)?.rawPrice ?? null;
}

export interface CatalogSearchParams {
  player: string;
  yearFrom?: number;
  yearTo?: number;
  sport?: string;
}

function parseReleaseYear(value: unknown): number | undefined {
  if (value == null) return undefined;
  const match = String(value).match(/^(\d{4})/);
  return match ? Number(match[1]) : undefined;
}

function mapCard(raw: Record<string, unknown>): CatalogCard {
  const prices = raw.prices as Record<string, string> | undefined;
  return {
    playerName: String(raw.name ?? ""),
    year: parseReleaseYear(raw.releaseYear),
    brand: raw.releaseName ? String(raw.releaseName) : undefined,
    setName: raw.setName ? String(raw.setName) : undefined,
    cardNumber: raw.number ? String(raw.number) : undefined,
    variant: raw.parallel
      ? String((raw.parallel as Record<string, unknown>).name ?? raw.parallel)
      : undefined,
    rawPrice: prices?.raw ? parseFloat(prices.raw) : undefined,
  };
}

interface PageResult {
  cards: CatalogCard[];
  totalCount: number;
}

async function fetchPage(
  player: string,
  sport: string | undefined,
  skip: number,
  apiKey: string,
): Promise<PageResult | null> {
  const query = new URLSearchParams({
    name: player,
    take: String(PAGE_SIZE),
    skip: String(skip),
  });
  if (sport) query.set("sport", sport);

  const url = `${CARDSIGHT_API_BASE}/v1/catalog/cards?${query.toString()}`;
  const response = await fetch(url, { headers: { "X-API-Key": apiKey } });
  if (!response.ok) {
    const body = await response.text();
    console.error(`[CardSight catalog] ${response.status}`, body);
    return null;
  }

  const data = await response.json() as Record<string, unknown>;
  const totalCount = typeof data.total_count === "number" ? data.total_count : 0;
  const raw = (data.cards ?? []) as Record<string, unknown>[];
  return { cards: raw.map(mapCard), totalCount };
}

// Cache stores unfiltered results keyed by player+sport. Year filtering is applied on read.
const catalogCache = new Map<string, { cards: CatalogCard[]; expiresAt: number }>();

export function clearCatalogCache(): void {
  catalogCache.clear();
}

function catalogCacheKey(player: string, sport: string | undefined): string {
  return `${player}|${sport ?? ""}`;
}

function filterByYearRange(cards: CatalogCard[], yearFrom?: number, yearTo?: number): CatalogCard[] {
  return cards.filter((card) => {
    if (yearFrom != null && card.year != null && card.year < yearFrom) return false;
    if (yearTo != null && card.year != null && card.year > yearTo) return false;
    return true;
  });
}

async function fetchAllPages(
  params: CatalogSearchParams,
  apiKey: string,
): Promise<CatalogCard[] | null> {
  const key = catalogCacheKey(params.player, params.sport);
  const cached = catalogCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return filterByYearRange(cached.cards, params.yearFrom, params.yearTo);
  }

  const first = await fetchPage(params.player, params.sport, 0, apiKey);
  if (!first) return null;

  const pageCount = Math.min(Math.ceil(first.totalCount / PAGE_SIZE), MAX_PAGES);
  const allCards = [...first.cards];

  // Fetch remaining pages in parallel batches to stay within rate limit
  for (let i = 1; i < pageCount; i += CONCURRENT_PAGES) {
    const batchEnd = Math.min(i + CONCURRENT_PAGES, pageCount);
    const indices = Array.from({ length: batchEnd - i }, (_, j) => i + j);
    const pages = await Promise.all(
      indices.map((idx) => fetchPage(params.player, params.sport, idx * PAGE_SIZE, apiKey)),
    );
    for (const page of pages) {
      if (page) allCards.push(...page.cards);
    }
  }

  catalogCache.set(key, { cards: allCards, expiresAt: Date.now() + CACHE_TTL_MS });
  return filterByYearRange(allCards, params.yearFrom, params.yearTo);
}

export async function searchCatalog(
  params: CatalogSearchParams,
  apiKey: string | undefined,
): Promise<CatalogCard[] | null> {
  if (!apiKey) return [];
  return fetchAllPages(params, apiKey);
}

// Returns { price } on success (price is null if the card has no listed price),
// or null if an API request fails.
export async function findPriceInCatalog(
  searchParams: CatalogSearchParams,
  priceParams: PriceMatchParams,
  apiKey: string,
): Promise<{ price: number | null } | null> {
  const start = Date.now();
  const cards = await fetchAllPages(searchParams, apiKey);
  console.log(`[findPriceInCatalog] fetched ${cards?.length ?? "null"} cards in ${Date.now() - start}ms`);
  if (cards === null) return null;

  const match = findMatchingCard(cards, priceParams);
  return { price: match?.rawPrice ?? null };
}
