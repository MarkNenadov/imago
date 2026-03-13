import type { Card } from "@/db/schema";

const IMPORTANT_FIELDS = [
  { key: "purchasePrice", label: "Price" },
  { key: "purchaseDate", label: "Purchase Date" },
  { key: "team", label: "Team" },
  { key: "location", label: "Location" },
  { key: "imageFront", label: "Front Image" },
] as const;

const POSITION_TAGS = new Set([
  "batter", "batters",
  "catcher", "catchers",
  "hitter", "hitters",
  "pitcher", "pitchers",
  "coach", "coaches",
  "manager", "managers",
  "shortstop", "shortstops",
  "defenceman", "defencemen",
  "forward", "forwards",
  "goalie", "goalies",
]);

export function getMissingFields(card: Card): string[] {
  const missing: string[] = [];

  for (const { key, label } of IMPORTANT_FIELDS) {
    const value = card[key];
    if (value == null || value === "") missing.push(label);
  }

  const tags = (card.tags as string[]) ?? [];
  const hasPositionTag = tags.some((t) => POSITION_TAGS.has(t.toLowerCase()));
  if (!hasPositionTag) missing.push("Position Tag");

  return missing;
}
