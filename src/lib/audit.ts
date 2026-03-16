import type { Card, CardPlayer } from "@/db/schema";

const SCALAR_IMPORTANT_FIELDS = [
  { key: "purchasePrice", label: "Price" },
  { key: "purchaseDate", label: "Purchase Date" },
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

  for (const { key, label } of SCALAR_IMPORTANT_FIELDS) {
    const value = card[key];
    if (value == null || value === "") missing.push(label);
  }

  const players = (card.players as CardPlayer[]) ?? [];
  const hasTeam = players.some((p) => p.team);
  if (!hasTeam) missing.push("Team");

  const tags = (card.tags as string[]) ?? [];
  const hasPositionTag = tags.some((t) => POSITION_TAGS.has(t.toLowerCase()));
  if (!hasPositionTag) missing.push("Position Tag");

  return missing;
}
