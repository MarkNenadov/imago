import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const referenceCards = sqliteTable("reference_cards", {
  id: text("id").primaryKey(),
  playerName: text("player_name").notNull(),
  year: integer("year"),
  brand: text("brand"),
  setName: text("set_name"),
  cardNumber: text("card_number"),
  sport: text("sport").notNull(),
  subset: text("subset"),
  attributes: text("attributes"),
});
