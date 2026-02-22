const CARDSIGHT_API_BASE = "https://api.cardsight.ai";

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
    playerName: String(raw.name ?? raw.playerName ?? ""),
    year: raw.year ? Number(raw.year) : undefined,
    brand: raw.manufacturer ? String(raw.manufacturer) : undefined,
    setName: raw.releaseName
      ? String(raw.releaseName)
      : raw.setName
        ? String(raw.setName)
        : undefined,
    cardNumber: raw.number ? String(raw.number) : undefined,
    variant: raw.parallel
      ? String((raw.parallel as Record<string, unknown>).name ?? raw.parallel)
      : undefined,
  };
}

export async function searchCatalog(
  params: CatalogSearchParams,
  apiKey: string | undefined,
): Promise<CatalogCard[]> {
  if (!apiKey) return [];

  const query = new URLSearchParams({ player: params.player });
  if (params.yearFrom) query.set("yearFrom", String(params.yearFrom));
  if (params.yearTo) query.set("yearTo", String(params.yearTo));
  if (params.sport) query.set("sport", params.sport);

  const response = await fetch(
    `${CARDSIGHT_API_BASE}/v1/catalog/cards?${query.toString()}`,
    { headers: { "X-API-Key": apiKey } },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `[CardSight catalog] ${response.status} ${response.statusText}`,
      body,
    );
    return [];
  }

  const data = await response.json() as Record<string, unknown>;
  const raw = (data.cards ?? data.results ?? data.detections ?? []) as Record<string, unknown>[];
  return raw.map(mapCard);
}
