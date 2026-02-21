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

export interface PhotoQualityResponse {
  total: number;
  flagged: FlaggedCard[];
}

// Calibration: adjust these to tune sensitivity.
// blurScore: Laplacian stdev clamped to 100 — lower threshold = fewer blur flags
// noiseScore: residualStdev/75 * 100 — higher threshold = fewer noise flags
// backgroundScore: composite uniformity 0–100 — higher threshold = fewer background flags
const BLUR_FLAG_THRESHOLD = 4;
const NOISE_FLAG_THRESHOLD = 30;
const BACKGROUND_FLAG_THRESHOLD = 30;

// Laplacian kernel for edge detection. Low output variance = blurry image.
const LAPLACIAN_KERNEL = {
  width: 3,
  height: 3,
  kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
};

const BATCH_SIZE = 8;

async function analyzeImage(
  absolutePath: string,
): Promise<FlaggedCard["scores"] & { issues: FlaggedCard["issues"] }> {
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

  // Collect all image tasks
  const imageTasks: Array<{
    absolutePath: string;
    card: (typeof allCards)[0];
    type: "front" | "back";
  }> = [];

  for (const card of allCards) {
    if (card.imageFront) {
      const p = path.join(process.cwd(), "public", card.imageFront);
      imageTasks.push({ absolutePath: p, card, type: "front" });
    }
    if (card.imageBack) {
      const p = path.join(process.cwd(), "public", card.imageBack);
      imageTasks.push({ absolutePath: p, card, type: "back" });
    }
  }

  // Filter to only existing files (async, no event loop blocking)
  const existingTasks = (
    await Promise.all(
      imageTasks.map(async (task) => {
        try {
          await fs.promises.access(task.absolutePath);
          return task;
        } catch {
          return null;
        }
      }),
    )
  ).filter((t): t is NonNullable<typeof t> => t !== null);

  const total = existingTasks.length;

  // Process in batches to avoid overwhelming Sharp
  const flagged: FlaggedCard[] = [];

  for (let i = 0; i < existingTasks.length; i += BATCH_SIZE) {
    const batch = existingTasks.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ({ absolutePath, card, type }) => {
        try {
          const { issues, ...scores } = await analyzeImage(absolutePath);
          if (issues.length > 0) {
            return {
              cardId: card.id,
              playerName: card.playerName,
              year: card.year ?? null,
              brand: card.brand ?? null,
              imageType: type,
              issues,
              scores,
            } satisfies FlaggedCard;
          }
          return null;
        } catch (err) {
          console.error(`photo-quality: skipping ${absolutePath}:`, err);
          return null;
        }
      }),
    );
    flagged.push(...results.filter((r): r is FlaggedCard => r !== null));
  }

  return NextResponse.json({ total, flagged } satisfies PhotoQualityResponse);
}
