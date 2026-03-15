import { describe, expect, it } from "vitest";
import {
  blurScore,
  noiseScore,
  backgroundScore,
  type ChannelStats,
} from "./photo-quality";

// ChannelStats mirrors the shape returned by sharp().stats() for one channel
// { mean: number; stdev: number; min: number; max: number }

describe("blurScore", () => {
  it("returns low score for low-stdev laplacian output (blurry)", () => {
    // A blurry image produces nearly uniform output from a Laplacian kernel,
    // so the stdev of that output is very low.
    const laplacianStats: ChannelStats = { mean: 10, stdev: 3, min: 0, max: 30 };
    expect(blurScore(laplacianStats)).toBeLessThan(15);
  });

  it("returns high score for high-stdev laplacian output (sharp)", () => {
    const laplacianStats: ChannelStats = { mean: 50, stdev: 60, min: 0, max: 255 };
    expect(blurScore(laplacianStats)).toBeGreaterThan(50);
  });
});

describe("noiseScore", () => {
  it("returns low score for smooth image (low residual stdev)", () => {
    // residualStdev is computed externally as (original stdev - blurred stdev)
    expect(noiseScore(2)).toBeLessThan(20);
  });

  it("returns high score for grainy image (high residual stdev)", () => {
    expect(noiseScore(65)).toBeGreaterThan(70);
  });
});

describe("backgroundScore", () => {
  it("returns high score when all corners are uniform (pure background)", () => {
    // All four corner patches have nearly identical mean color — uniform background.
    const corners: [ChannelStats, ChannelStats, ChannelStats, ChannelStats] = [
      { mean: 240, stdev: 2, min: 235, max: 245 },
      { mean: 238, stdev: 2, min: 233, max: 243 },
      { mean: 241, stdev: 2, min: 236, max: 246 },
      { mean: 239, stdev: 2, min: 234, max: 244 },
    ];
    expect(backgroundScore(corners)).toBeGreaterThan(60);
  });

  it("returns low score when corners have varied content", () => {
    // Corners differ from each other — card fills the frame.
    const corners: [ChannelStats, ChannelStats, ChannelStats, ChannelStats] = [
      { mean: 240, stdev: 40, min: 100, max: 255 },
      { mean: 80,  stdev: 35, min: 20,  max: 200 },
      { mean: 160, stdev: 50, min: 30,  max: 255 },
      { mean: 200, stdev: 45, min: 60,  max: 255 },
    ];
    expect(backgroundScore(corners)).toBeLessThan(40);
  });
});
