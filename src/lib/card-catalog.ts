const CARDSIGHT_API_BASE = "https://api.cardsight.ai";
const PAGE_SIZE = 100;
const MAX_YEARS_FOR_PER_YEAR_STRATEGY = 10;

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

async function fetchYear(
  player: string,
  year: number,
  sport: string | undefined,
  apiKey: string,
): Promise<CatalogCard[]> {
  const query = new URLSearchParams({
    name: player,
    releaseYear: String(year),
    take: String(PAGE_SIZE),
  });
  if (sport) query.set("sport", sport);

  const url = `${CARDSIGHT_API_BASE}/v1/catalog/cards?${query.toString()}`;
  const response = await fetch(url, { headers: { "X-API-Key": apiKey } });
  if (!response.ok) {
    const body = await response.text();
    console.error(`[CardSight catalog] ${response.status}`, body);
    return [];
  }

  const data = await response.json() as Record<string, unknown>;
  const raw = (data.cards ?? []) as Record<string, unknown>[];
  return raw.map(mapCard).filter((c) => c.year === year);
}

async function fetchAllYears(
  params: CatalogSearchParams,
  apiKey: string,
): Promise<CatalogCard[]> {
  const yearFrom = params.yearFrom!;
  const yearTo = params.yearTo!;
  const years: number[] = [];
  for (let y = yearFrom; y <= yearTo; y++) years.push(y);

  const perYear = await Promise.all(
    years.map((y) => fetchYear(params.player, y, params.sport, apiKey)),
  );
  return perYear.flat();
}

async function fetchSinglePage(
  params: CatalogSearchParams,
  apiKey: string,
): Promise<CatalogCard[]> {
  const query = new URLSearchParams({ name: params.player, take: String(PAGE_SIZE) });
  if (params.sport) query.set("sport", params.sport);

  const url = `${CARDSIGHT_API_BASE}/v1/catalog/cards?${query.toString()}`;
  const response = await fetch(url, { headers: { "X-API-Key": apiKey } });
  if (!response.ok) {
    const body = await response.text();
    console.error(`[CardSight catalog] ${response.status}`, body);
    return [];
  }

  const data = await response.json() as Record<string, unknown>;
  const raw = (data.cards ?? []) as Record<string, unknown>[];
  const mapped = raw.map(mapCard);

  return mapped.filter((card) => {
    if (params.yearFrom && card.year != null && card.year < params.yearFrom) return false;
    if (params.yearTo && card.year != null && card.year > params.yearTo) return false;
    return true;
  });
}

export async function searchCatalog(
  params: CatalogSearchParams,
  apiKey: string | undefined,
): Promise<CatalogCard[]> {
  if (!apiKey) return [];

  const yearSpan =
    params.yearFrom && params.yearTo ? params.yearTo - params.yearFrom + 1 : null;

  // Per-year strategy: one parallel request per year in range.
  // Gives much better results than fetching all cards and filtering alphabetically.
  if (yearSpan !== null && yearSpan <= MAX_YEARS_FOR_PER_YEAR_STRATEGY) {
    return fetchAllYears(params, apiKey);
  }

  return fetchSinglePage(params, apiKey);
}
