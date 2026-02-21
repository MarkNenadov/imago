export interface ChannelStats {
  mean: number;
  stdev: number;
  // min and max are included to match Sharp's channel stats shape for structural
  // compatibility; current scoring functions do not use them.
  min: number;
  max: number;
}

/**
 * Scores sharpness from Laplacian-filtered image stats.
 * Low score = blurry. Scale: 0 (very blurry) to 100 (very sharp).
 * Input: stats of the image after applying a Laplacian convolution kernel.
 */
export function blurScore(laplacianStats: ChannelStats): number {
  // Score = stdev clamped to 100.
  return Math.min(100, Math.round(laplacianStats.stdev));
}

/**
 * Scores noise/grain from the residual between original and blurred image stdev.
 * High score = noisy. Scale: 0 (smooth) to 100 (very grainy).
 * Input: residualStdev = original.stdev - blurred.stdev (per-channel average).
 */
export function noiseScore(residualStdev: number): number {
  // Map residualStdev 0–75 to score 0–100; clamp to [0, 100].
  return Math.max(0, Math.min(100, Math.round((residualStdev / 75) * 100)));
}

/**
 * Scores background uniformity from four corner patch stats.
 * High score = uniform background (card is small in frame).
 * Scale: 0 (varied corners, card fills frame) to 100 (all corners identical).
 * Input: array of exactly 4 ChannelStats, one per corner patch (grayscale mean).
 */
export function backgroundScore(
  corners: [ChannelStats, ChannelStats, ChannelStats, ChannelStats],
): number {
  const means = corners.map((c) => c.mean);
  const avg = means.reduce((a, b) => a + b, 0) / means.length;
  const variance =
    means.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / means.length;
  const spreadStdev = Math.sqrt(variance);

  // Low spread between corner means = uniform = high background score.
  // Map spread 0–80 inverted to 0–100.
  const uniformity = Math.max(0, 1 - spreadStdev / 80);

  // Also factor in low per-patch stdev (each corner itself is uniform).
  const avgPatchStdev = corners.reduce((s, c) => s + c.stdev, 0) / corners.length;
  const patchUniformity = Math.max(0, 1 - avgPatchStdev / 60);

  return Math.round(((uniformity + patchUniformity) / 2) * 100);
}
