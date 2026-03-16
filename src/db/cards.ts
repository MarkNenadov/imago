import { eq, like, or, and, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { cards, type Card, type NewCard } from "./schema";
import type { getDb } from "./index";

type DrizzleDb = ReturnType<typeof getDb>;

export function createCard(db: DrizzleDb, data: Omit<NewCard, "id">): Card {
  const id = uuid();
  db.insert(cards).values({ ...data, id }).run();
  return db.select().from(cards).where(eq(cards.id, id)).get()!;
}

export function getCardById(db: DrizzleDb, id: string): Card | undefined {
  return db.select().from(cards).where(eq(cards.id, id)).get();
}

interface ListFilters {
  q?: string;
  sport?: string;
  location?: string;
  brand?: string;
  team?: string;
  year?: number;
  tag?: string;
  setName?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface PaginatedCards {
  cards: Card[];
  total: number;
  totalCost: number;
}

export function listCards(db: DrizzleDb, filters?: ListFilters): Card[] {
  return listCardsPaginated(db, filters).cards;
}

export function listCardsPaginated(db: DrizzleDb, filters?: ListFilters): PaginatedCards {
  let query = db.select().from(cards).$dynamic();
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(cards).$dynamic();
  let costQuery = db.select({ sum: sql<number | null>`sum(${cards.purchasePrice})` }).from(cards).$dynamic();

  const conditions: SQL[] = [];
  if (filters?.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        like(cards.players, pattern),
        like(cards.brand, pattern),
        like(cards.setName, pattern),
        like(cards.notes, pattern),
      )!,
    );
  }
  if (filters?.sport) conditions.push(eq(cards.sport, filters.sport));
  if (filters?.location) conditions.push(eq(cards.location, filters.location));
  if (filters?.brand) conditions.push(eq(cards.brand, filters.brand));
  if (filters?.team) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM json_each(${cards.players}) WHERE json_extract(value, '$.team') = ${filters.team})`,
    );
  }
  if (filters?.year) conditions.push(eq(cards.year, filters.year));
  if (filters?.tag) conditions.push(like(cards.tags, `%"${filters.tag}"%`));
  if (filters?.setName) conditions.push(eq(cards.setName, filters.setName));

  if (conditions.length > 0) {
    const where = and(...conditions)!;
    query = query.where(where);
    countQuery = countQuery.where(where);
    costQuery = costQuery.where(where);
  }

  if (filters?.sortBy) {
    if (filters.sortBy === "players") {
      const expr = sql<string>`json_extract(${cards.players}, '$[0].name')`;
      query = query.orderBy(
        filters.sortOrder === "desc"
          ? sql`${expr} DESC NULLS LAST`
          : sql`${expr} ASC NULLS LAST`,
      );
    } else {
      const sortableColumns: Record<string, AnyColumn> = {
        year: cards.year,
        brand: cards.brand,
        purchasePrice: cards.purchasePrice,
        createdAt: cards.createdAt,
        location: cards.location,
      };
      const col = sortableColumns[filters.sortBy];
      if (col) {
        query = query.orderBy(
          filters.sortOrder === "desc"
            ? sql`${col} DESC NULLS LAST`
            : sql`${col} ASC NULLS LAST`,
        );
      }
    }
  }

  const total = countQuery.get()!.count;
  const totalCost = costQuery.get()!.sum ?? 0;

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.offset(filters.offset);
  }

  return { cards: query.all(), total, totalCost };
}

export function searchCards(db: DrizzleDb, query: string): Card[] {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(cards)
    .where(
      or(
        like(cards.players, pattern),
        like(cards.brand, pattern),
        like(cards.setName, pattern),
        like(cards.notes, pattern),
      ),
    )
    .all();
}

export function renameTag(db: DrizzleDb, fromTag: string, toTag: string): number {
  const matching = db
    .select()
    .from(cards)
    .where(like(cards.tags, `%"${fromTag}"%`))
    .all();

  let updated = 0;
  for (const card of matching) {
    const tags = (card.tags as string[]) ?? [];
    const withoutOld = tags.filter((t) => t !== fromTag);
    const withNew = withoutOld.includes(toTag) ? withoutOld : [...withoutOld, toTag];
    updateCard(db, card.id, { tags: withNew });
    updated++;
  }
  return updated;
}

export function renameLocation(db: DrizzleDb, fromLocation: string, toLocation: string): number {
  const matching = db
    .select()
    .from(cards)
    .where(eq(cards.location, fromLocation))
    .all();

  for (const card of matching) {
    updateCard(db, card.id, { location: toLocation });
  }
  return matching.length;
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
