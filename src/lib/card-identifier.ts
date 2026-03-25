import sharp from "sharp";

export interface CardIdentificationResult {
  requestId?: string;
  playerName: string;
  year?: number;
  brand?: string;
  setName?: string;
  cardNumber?: string;
  variant?: string;
  confidence?: string;
}

// TODO: Use a vision-capable LLM (Claude, GPT-4o) to extract team name
// from the card image. CardSight API doesn't return team data, but the
// team logo/name is usually visible on the card front.

const CARDSIGHT_API_BASE = "https://api.cardsight.ai";
const MAX_IMAGE_WIDTH = 900;
const MAX_IMAGE_HEIGHT = 1200;

export function isIdentificationAvailable(): boolean {
  return !!process.env.CARDSIGHT_API_KEY;
}

export function isCardSightDisabled(): boolean {
  return process.env.CARDSIGHT_DISABLED === "true";
}

async function compressImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function identifyCard(
  imageBuffer: Buffer,
  sport = "baseball",
): Promise<CardIdentificationResult | null> {
  const apiKey = process.env.CARDSIGHT_API_KEY;
  if (!apiKey) {
    return null;
  }

  const compressed = await compressImage(imageBuffer);
  const blob = new Blob([compressed as BlobPart], { type: "image/jpeg" });
  const formData = new FormData();
  formData.append("image", blob, "card.jpg");

  const response = await fetch(
    `${CARDSIGHT_API_BASE}/v1/identify/card/${encodeURIComponent(sport)}`,
    {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: formData,
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`CardSight API error: ${response.status} ${response.statusText}`, body);
    return null;
  }

  const data = await response.json();
  console.log("[CardSight] Raw API response:", JSON.stringify(data, null, 2));

  if (!data.success || !data.detections?.length) {
    return null;
  }

  const detection = data.detections[0];
  const card = detection.card;

  const result = {
    requestId: data.requestId ?? undefined,
    playerName: card.name ?? "",
    year: card.year ? Number(card.year) : undefined,
    brand: card.manufacturer ?? undefined,
    setName: card.releaseName ?? card.setName ?? undefined,
    cardNumber: card.number ?? undefined,
    variant: card.parallel?.name ?? undefined,
    confidence: detection.confidence ?? undefined,
  };
  console.log("[CardSight] Mapped result:", JSON.stringify(result, null, 2));

  return result;
}
