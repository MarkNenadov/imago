import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  playerName: text("player_name").notNull(),
  year: integer("year"),
  brand: text("brand"),
  setName: text("set_name"),
  cardNumber: text("card_number"),
  team: text("team"),
  sport: text("sport").notNull().default("baseball"),
  variant: text("variant"),
  condition: text("condition"),
  purchasePrice: real("purchase_price"),
  purchaseDate: text("purchase_date"),
  purchaseSource: text("purchase_source"),
  location: text("location"),
  imageFront: text("image_front"),
  imageBack: text("image_back"),
  notes: text("notes"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;

export const imageHashes = sqliteTable("image_hashes", {
  hash: text("hash").primaryKey(),
  imagePath: text("image_path").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const wishlistItems = sqliteTable("wishlist_items", {
  id: text("id").primaryKey(),
  playerName: text("player_name").notNull(),
  year: integer("year"),
  brand: text("brand"),
  setName: text("set_name"),
  cardNumber: text("card_number"),
  variant: text("variant"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type NewWishlistItem = typeof wishlistItems.$inferInsert;

export { referenceCards } from "./reference-schema";
