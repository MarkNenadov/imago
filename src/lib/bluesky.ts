import type { Card } from "@/db/schema";

const SPORT_CARD_HASHTAGS: Record<string, [string, string]> = {
  baseball: ["#baseballcard", "#baseballcards"],
  hockey: ["#hockeycard", "#hockeycards"],
};

export function buildPostText(card: Card): string {
  const lines: string[] = [];

  // Line 1: year brand playerName #cardNumber
  const line1 = [
    card.year ? String(card.year) : null,
    card.brand ?? null,
    card.playerName,
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

  // Line 3: Sport · Team
  const sport = card.sport.charAt(0).toUpperCase() + card.sport.slice(1);
  const line3 = [sport, card.team ?? null].filter(Boolean).join(" · ");
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
    ...(card.team ? [toHashtag(card.team)] : []),
    ...(isJunkWaxEra ? ["#junkwax"] : []),
  ];
  lines.push(hashtags.join(" "));

  return lines.join("\n");
}
