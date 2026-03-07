const CARDSIGHT_API_BASE = "https://api.cardsight.ai";
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

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

export function findMatchingPrice(
  cards: CatalogCard[],
  params: PriceMatchParams,
): number | null {
  const match = cards.find((card) => {
    if (card.year !== params.year) return false;
    if (card.brand !== params.brand) return false;
    if (params.setName != null && card.setName !== params.setName) return false;
    if (params.cardNumber != null && card.cardNumber !== params.cardNumber) return false;
    if (params.variant != null && card.variant !== params.variant) return false;
    return true;
  });
  return match?.rawPrice ?? null;
}

export interface CatalogSearchParams {
  player: string;
  yearFrom?: number;
  yearTo?: number;
  sport?: string;
}

function mapCard(raw: Record<string, unknown>): CatalogCard {
  const prices = raw.prices as Record<string, string> | undefined;
  return {
    playerName: String(raw.name ?? ""),
    year: raw.releaseYear ? Number(raw.releaseYear) : undefined,
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

async function fetchAllPages(
  params: CatalogSearchParams,
  apiKey: string,
): Promise<CatalogCard[] | null> {
  const first = await fetchPage(params.player, params.sport, 0, apiKey);
  if (!first) return null;

  const pageCount = Math.min(Math.ceil(first.totalCount / PAGE_SIZE), MAX_PAGES);
  const allCards = [...first.cards];

  // Sequential requests to respect the 4 req/sec rate limit
  for (let i = 1; i < pageCount; i++) {
    const page = await fetchPage(params.player, params.sport, i * PAGE_SIZE, apiKey);
    if (page) allCards.push(...page.cards);
  }

  return allCards.filter((card) => {
    if (params.yearFrom != null && card.year != null && card.year < params.yearFrom) return false;
    if (params.yearTo != null && card.year != null && card.year > params.yearTo) return false;
    return true;
  });
}

export async function searchCatalog(
  params: CatalogSearchParams,
  apiKey: string | undefined,
): Promise<CatalogCard[] | null> {
  if (!apiKey) return [];
  return fetchAllPages(params, apiKey);
}
