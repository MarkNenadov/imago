const CARDSIGHT_API_BASE = "https://api.cardsight.ai";
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // cap at 2000 cards to prevent runaway requests

export interface CatalogCard {
  playerName: string;
  year?: number;
  brand?: string;
  setName?: string;
  cardNumber?: string;
  variant?: string;
}

export interface CatalogSearchParams {
  player: string;
  yearFrom?: number;
  yearTo?: number;
  sport?: string;
}

function mapCard(raw: Record<string, unknown>): CatalogCard {
  return {
    playerName: String(raw.name ?? ""),
    year: raw.releaseYear ? Number(raw.releaseYear) : undefined,
    brand: raw.releaseName ? String(raw.releaseName) : undefined,
    setName: raw.setName ? String(raw.setName) : undefined,
    cardNumber: raw.number ? String(raw.number) : undefined,
    variant: raw.parallel
      ? String((raw.parallel as Record<string, unknown>).name ?? raw.parallel)
      : undefined,
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
): Promise<CatalogCard[]> {
  const first = await fetchPage(params.player, params.sport, 0, apiKey);
  if (!first) return [];

  const pageCount = Math.min(Math.ceil(first.totalCount / PAGE_SIZE), MAX_PAGES);

  const remainingCards = pageCount > 1
    ? (await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, i) =>
          fetchPage(params.player, params.sport, (i + 1) * PAGE_SIZE, apiKey),
        ),
      )).flatMap((p) => p?.cards ?? [])
    : [];

  const allCards = [...first.cards, ...remainingCards];

  return allCards.filter((card) => {
    if (params.yearFrom != null && card.year != null && card.year < params.yearFrom) return false;
    if (params.yearTo != null && card.year != null && card.year > params.yearTo) return false;
    return true;
  });
}

export async function searchCatalog(
  params: CatalogSearchParams,
  apiKey: string | undefined,
): Promise<CatalogCard[]> {
  if (!apiKey) return [];
  return fetchAllPages(params, apiKey);
}
