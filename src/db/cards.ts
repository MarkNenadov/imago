import { eq, like, or, desc, asc, type AnyColumn } from "drizzle-orm";
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
  sport?: string;
  location?: string;
  brand?: string;
  team?: string;
  year?: number;
  tag?: string;
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
  if (filters?.team) {
    query = query.where(eq(cards.team, filters.team));
  }
  if (filters?.year) {
    query = query.where(eq(cards.year, filters.year));
  }
  if (filters?.tag) {
    query = query.where(like(cards.tags, `%"${filters.tag}"%`));
  }

  if (filters?.sortBy) {
    const sortableColumns: Record<string, AnyColumn> = {
      playerName: cards.playerName,
      year: cards.year,
      brand: cards.brand,
      team: cards.team,
      purchasePrice: cards.purchasePrice,
      createdAt: cards.createdAt,
      location: cards.location,
    };
    const col = sortableColumns[filters.sortBy];
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
