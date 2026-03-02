import { cards } from "./schema";
import type { getDb } from "./index";

type DrizzleDb = ReturnType<typeof getDb>;

interface ExpensiveCard {
  id: string;
  playerName: string;
  year: number | null;
  brand: string | null;
  purchasePrice: number;
}

interface CollectionStats {
  totalCards: number;
  totalImages: number;
  distinctPlayers: number;
  totalInvested: number;
  topExpensive: ExpensiveCard[];
  bySport: Record<string, number>;
  byLocation: Record<string, number>;
  byTeam: Record<string, number>;
  byYear: Record<string, number>;
  byBrand: Record<string, number>;
  byEntryMonth: Record<string, number>;
  byDecade: Record<string, number>;
  rookieVsNon: Record<string, number>;
  batterVsPitcher: Record<string, number>;
  hofVsNon: Record<string, number>;
}

export function getCollectionStats(db: DrizzleDb): CollectionStats {
  const allCards = db.select().from(cards).all();

  const totalCards = allCards.length;
  const totalImages = allCards.reduce(
    (sum, c) => sum + (c.imageFront ? 1 : 0) + (c.imageBack ? 1 : 0),
    0,
  );
  const distinctPlayers = new Set(allCards.map((c) => c.playerName)).size;
  const totalInvested = allCards.reduce((sum, c) => sum + (c.purchasePrice ?? 0), 0);
  const topExpensive: ExpensiveCard[] = allCards
    .filter((c) => c.purchasePrice != null)
    .sort((a, b) => (b.purchasePrice ?? 0) - (a.purchasePrice ?? 0))
    .slice(0, 5)
    .map(({ id, playerName, year, brand, purchasePrice }) => ({
      id,
      playerName,
      year,
      brand,
      purchasePrice: purchasePrice!,
    }));

  const bySport: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  const byTeam: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  const byBrand: Record<string, number> = {};
  const byEntryMonth: Record<string, number> = {};
  const byDecade: Record<string, number> = {};
  const rookieVsNon: Record<string, number> = { "Rookie Card": 0, "Non-Rookie": 0 };
  const batterVsPitcher: Record<string, number> = { Batter: 0, Pitcher: 0, Manager: 0, Defencemen: 0, Forward: 0, Goalie: 0, Unknown: 0 };
  const hofVsNon: Record<string, number> = { "Hall of Famer": 0, "Non-HOF": 0 };

  for (const card of allCards) {
    bySport[card.sport] = (bySport[card.sport] ?? 0) + 1;
    if (card.location) {
      byLocation[card.location] = (byLocation[card.location] ?? 0) + 1;
    }
    if (card.team) {
      byTeam[card.team] = (byTeam[card.team] ?? 0) + 1;
    }
    if (card.year) {
      byYear[String(card.year)] = (byYear[String(card.year)] ?? 0) + 1;
    }
    if (card.brand) {
      byBrand[card.brand] = (byBrand[card.brand] ?? 0) + 1;
    }

    // Entry date by month (YYYY-MM)
    if (card.createdAt) {
      const month = card.createdAt.slice(0, 7);
      byEntryMonth[month] = (byEntryMonth[month] ?? 0) + 1;
    }

    // Tag-based stats
    const tagList = (card.tags as string[]) ?? [];
    const tagSet = new Set(tagList.map((t) => t.toLowerCase()));

    // Decade breakdown (derived from card year)
    if (card.year) {
      const decadeStart = Math.floor(card.year / 10) * 10;
      const decadeLabel = `${decadeStart}s`;
      byDecade[decadeLabel] = (byDecade[decadeLabel] ?? 0) + 1;
    } else {
      byDecade["Other"] = (byDecade["Other"] ?? 0) + 1;
    }

    // Rookie vs non-rookie
    if (tagSet.has("rc") || tagSet.has("rookie")) {
      rookieVsNon["Rookie Card"] += 1;
    } else {
      rookieVsNon["Non-Rookie"] += 1;
    }

    // Position type (match singular and plural forms)
    if (tagSet.has("pitcher") || tagSet.has("pitchers")) {
      batterVsPitcher["Pitcher"] += 1;
    } else if (tagSet.has("batter") || tagSet.has("batters") || tagSet.has("hitter") || tagSet.has("hitters")) {
      batterVsPitcher["Batter"] += 1;
    } else if (tagSet.has("manager") || tagSet.has("managers")) {
      batterVsPitcher["Manager"] += 1;
    } else if (tagSet.has("defencemen") || tagSet.has("defenseman")) {
      batterVsPitcher["Defencemen"] += 1;
    } else if (tagSet.has("forward")) {
      batterVsPitcher["Forward"] += 1;
    } else if (tagSet.has("goalie")) {
      batterVsPitcher["Goalie"] += 1;
    } else {
      batterVsPitcher["Unknown"] += 1;
    }

    // HOF vs non-HOF
    if (tagSet.has("hof")) {
      hofVsNon["Hall of Famer"] += 1;
    } else {
      hofVsNon["Non-HOF"] += 1;
    }
  }

  return {
    totalCards,
    totalImages,
    distinctPlayers,
    totalInvested,
    topExpensive,
    bySport,
    byLocation,
    byTeam,
    byYear,
    byBrand,
    byEntryMonth,
    byDecade,
    rookieVsNon,
    batterVsPitcher: Object.fromEntries(Object.entries(batterVsPitcher).filter(([, v]) => v > 0)),
    hofVsNon,
  };
}

export interface FilterOptions {
  brands: string[];
  locations: string[];
  setNames: string[];
  tags: string[];
  teams: string[];
}

export function getFilterOptions(db: DrizzleDb): FilterOptions {
  const allCards = db.select().from(cards).all();

  const brandSet = new Set<string>();
  const locationSet = new Set<string>();
  const setNameSet = new Set<string>();
  const tagSet = new Set<string>();
  const teamSet = new Set<string>();

  for (const card of allCards) {
    if (card.brand) brandSet.add(card.brand);
    if (card.location) locationSet.add(card.location);
    if (card.setName) setNameSet.add(card.setName);
    if (card.team) teamSet.add(card.team);
    if (card.tags) {
      for (const tag of card.tags as string[]) {
        tagSet.add(tag);
      }
    }
  }

  return {
    brands: [...brandSet].sort(),
    locations: [...locationSet].sort(),
    setNames: [...setNameSet].sort(),
    tags: [...tagSet].sort(),
    teams: [...teamSet].sort(),
  };
}
