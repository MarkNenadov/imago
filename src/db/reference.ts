import { like, or } from "drizzle-orm";
import { referenceCards } from "./reference-schema";
import type { getDb } from "./index";

type DrizzleDb = ReturnType<typeof getDb>;

export function searchReferenceCards(
  db: DrizzleDb,
  query: string,
  limit = 20,
) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(referenceCards)
    .where(
      or(
        like(referenceCards.playerName, pattern),
        like(referenceCards.setName, pattern),
        like(referenceCards.brand, pattern),
      ),
    )
    .limit(limit)
    .all();
}
