import type { Card, CardPlayer } from "@/db/schema";

const SPORT_CARD_HASHTAGS: Record<string, [string, string]> = {
  baseball: ["#baseballcard", "#baseballcards"],
  hockey: ["#hockeycard", "#hockeycards"],
};

export function buildPostText(card: Card): string {
  const lines: string[] = [];
  const players = (card.players as CardPlayer[]) ?? [];
  const playerNames = players.map((p) => p.name).join(" / ");
  const teams = [...new Set(players.map((p) => p.team).filter(Boolean))] as string[];

  // Line 1: year brand playerNames #cardNumber
  const line1 = [
    card.year ? String(card.year) : null,
    card.brand ?? null,
    playerNames || null,
    card.cardNumber ? `#${card.cardNumber}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  lines.push(line1);

  // Line 2: setName (variant) — omitted if neither is present
  if (card.setName || card.variant) {
    const line2 = [
      card.setName ?? null,
      card.variant ? `(${card.variant})` : null,
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(line2);
  }

  // Line 3: Sport · Teams (unique)
  const sport = card.sport.charAt(0).toUpperCase() + card.sport.slice(1);
  const line3 = [sport, ...teams].filter(Boolean).join(" · ");
  lines.push(line3);

  // Hashtags — strip everything except letters and digits, then lowercase
  const toHashtag = (value: string) =>
    "#" + value.toLowerCase().replace(/[^a-z0-9]/g, "");

  const isJunkWaxEra =
    card.year !== null && card.year >= 1987 && card.year <= 1994;

  const sportCardHashtags = SPORT_CARD_HASHTAGS[card.sport] ?? [];

  const hashtags = [
    "#sportscards",
    toHashtag(card.sport),
    ...sportCardHashtags,
    ...(card.brand ? [toHashtag(card.brand)] : []),
    ...teams.map(toHashtag),
    ...(isJunkWaxEra ? ["#junkwax"] : []),
  ];
  lines.push(hashtags.join(" "));

  return lines.join("\n");
}
