import { listCards } from "@/db/cards";
import { listWishlistItems } from "@/db/wishlist";
import type { CatalogCard } from "@/lib/card-catalog";
import type { getDb } from "@/db";

type DrizzleDb = ReturnType<typeof getDb>;

// A catalog card is a "gap" if it matches neither a collection card nor a wishlist item.
// Match logic: playerName must match (case-insensitive); if both sides have year, they must match;
// if both sides have cardNumber, they must match.
function isMatch(
  a: { playerName: string; year?: number | null; cardNumber?: string | null },
  b: CatalogCard,
): boolean {
  if (a.playerName.toLowerCase() !== b.playerName.toLowerCase()) return false;
  if (b.year && a.year && a.year !== b.year) return false;
  if (b.cardNumber && a.cardNumber && a.cardNumber !== b.cardNumber) return false;
  return true;
}

export function filterCatalogGaps(db: DrizzleDb, catalog: CatalogCard[]): CatalogCard[] {
  const ownedCards = listCards(db);
  const wishlist = listWishlistItems(db);

  return catalog.filter(
    (card) =>
      !ownedCards.some((owned) => isMatch(owned, card)) &&
      !wishlist.some((item) => isMatch(item, card)),
  );
}
