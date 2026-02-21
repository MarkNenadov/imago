import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { getDb } from "@/db";
import { listCards } from "@/db/cards";
import { blurScore, noiseScore, backgroundScore } from "@/lib/photo-quality";
import type { ChannelStats } from "@/lib/photo-quality";

export interface FlaggedCard {
  cardId: string;
  playerName: string;
  year: number | null;
  brand: string | null;
  imageType: "front" | "back";
  issues: ("blur" | "noise" | "background")[];
  scores: { blur: number; noise: number; background: number };
}

interface PhotoQualityResponse {
  total: number;
  flagged: FlaggedCard[];
}

const BLUR_FLAG_THRESHOLD = 15;
const NOISE_FLAG_THRESHOLD = 70;
const BACKGROUND_FLAG_THRESHOLD = 60;

// Laplacian kernel for edge detection. Low output variance = blurry image.
const LAPLACIAN_KERNEL = {
  width: 3,
  height: 3,
  kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
};

async function analyzeImage(
  imagePath: string,
): Promise<FlaggedCard["scores"] & { issues: FlaggedCard["issues"] }> {
  const absolutePath = path.join(process.cwd(), "public", imagePath);

  const baseImage = sharp(absolutePath).greyscale();

  // Blur: apply Laplacian, measure output stdev.
  const laplacianBuffer = await baseImage
    .clone()
    .convolve(LAPLACIAN_KERNEL)
    .toBuffer();
  const laplacianStats = await sharp(laplacianBuffer).stats();
  const blur = blurScore(laplacianStats.channels[0] as ChannelStats);

  // Noise: compare original stdev vs blurred stdev; residual = noise.
  const [originalStats, blurredStats] = await Promise.all([
    baseImage.clone().stats(),
    baseImage.clone().blur(3).stats(),
  ]);
  const avgResidual =
    originalStats.channels.reduce(
      (sum, ch, i) =>
        sum +
        Math.max(
          0,
          (ch as ChannelStats).stdev -
            (blurredStats.channels[i] as ChannelStats).stdev,
        ),
      0,
    ) / originalStats.channels.length;
  const noise = noiseScore(avgResidual);

  // Background: sample 20x20 patches from all four corners.
  const meta = await baseImage.clone().metadata();
  const { width = 100, height = 100 } = meta;
  const patchSize = 20;

  const cornerExtracts = await Promise.all([
    baseImage
      .clone()
      .extract({ left: 0, top: 0, width: patchSize, height: patchSize })
      .stats(),
    baseImage
      .clone()
      .extract({
        left: Math.max(0, width - patchSize),
        top: 0,
        width: patchSize,
        height: patchSize,
      })
      .stats(),
    baseImage
      .clone()
      .extract({
        left: 0,
        top: Math.max(0, height - patchSize),
        width: patchSize,
        height: patchSize,
      })
      .stats(),
    baseImage
      .clone()
      .extract({
        left: Math.max(0, width - patchSize),
        top: Math.max(0, height - patchSize),
        width: patchSize,
        height: patchSize,
      })
      .stats(),
  ]);

  const cornerStats = cornerExtracts.map(
    (s) => s.channels[0] as ChannelStats,
  ) as [ChannelStats, ChannelStats, ChannelStats, ChannelStats];
  const background = backgroundScore(cornerStats);

  const issues: FlaggedCard["issues"] = [];
  if (blur < BLUR_FLAG_THRESHOLD) issues.push("blur");
  if (noise > NOISE_FLAG_THRESHOLD) issues.push("noise");
  if (background > BACKGROUND_FLAG_THRESHOLD) issues.push("background");

  return { blur, noise, background, issues };
}

export async function GET() {
  const db = getDb();
  const allCards = listCards(db);

  const flagged: FlaggedCard[] = [];
  let total = 0;

  for (const card of allCards) {
    const imagesToCheck: Array<{ path: string; type: "front" | "back" }> = [];

    if (card.imageFront) imagesToCheck.push({ path: card.imageFront, type: "front" });
    if (card.imageBack) imagesToCheck.push({ path: card.imageBack, type: "back" });

    for (const { path: imagePath, type } of imagesToCheck) {
      const absolutePath = path.join(process.cwd(), "public", imagePath);
      if (!fs.existsSync(absolutePath)) continue;

      total++;

      try {
        const { issues, ...scores } = await analyzeImage(imagePath);
        if (issues.length > 0) {
          flagged.push({
            cardId: card.id,
            playerName: card.playerName,
            year: card.year ?? null,
            brand: card.brand ?? null,
            imageType: type,
            issues,
            scores,
          });
        }
      } catch (err) {
        console.error(`photo-quality: skipping ${imagePath}:`, err);
      }
    }
  }

  return NextResponse.json({ total, flagged } satisfies PhotoQualityResponse);
}
