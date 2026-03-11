import type { Card } from "@/db/schema";

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

  // Hashtags
  const sportTag = "#" + card.sport.toLowerCase().replace(/\s+/g, "");
  lines.push(`#sportscards ${sportTag}`);

  return lines.join("\n");
}
