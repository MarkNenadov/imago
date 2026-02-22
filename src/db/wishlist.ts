import { eq, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { wishlistItems, type WishlistItem, type NewWishlistItem } from "./schema";
import type { getDb } from "./index";

type DrizzleDb = ReturnType<typeof getDb>;

export function createWishlistItem(
  db: DrizzleDb,
  data: Omit<NewWishlistItem, "id">,
): WishlistItem {
  const id = uuid();
  db.insert(wishlistItems).values({ ...data, id }).run();
  return db.select().from(wishlistItems).where(eq(wishlistItems.id, id)).get()!;
}

export function getWishlistItemById(
  db: DrizzleDb,
  id: string,
): WishlistItem | undefined {
  return db.select().from(wishlistItems).where(eq(wishlistItems.id, id)).get();
}

export function listWishlistItems(db: DrizzleDb): WishlistItem[] {
  return db
    .select()
    .from(wishlistItems)
    .orderBy(asc(wishlistItems.playerName), asc(wishlistItems.year))
    .all();
}

export function deleteWishlistItem(db: DrizzleDb, id: string): boolean {
  const result = db.delete(wishlistItems).where(eq(wishlistItems.id, id)).run();
  return result.changes > 0;
}
