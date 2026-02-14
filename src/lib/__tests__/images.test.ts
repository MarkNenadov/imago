import { describe, it, expect } from "vitest";
import { generateImagePath, isAllowedExtension } from "@/lib/images";

describe("generateImagePath", () => {
  it("should generate a path under /uploads/ with the given extension", () => {
    const path = generateImagePath("jpg");
    expect(path).toMatch(/^\/uploads\/[a-f0-9-]+\.jpg$/);
  });

  it("should generate unique paths", () => {
    const path1 = generateImagePath("png");
    const path2 = generateImagePath("png");
    expect(path1).not.toBe(path2);
  });
});

describe("isAllowedExtension", () => {
  it("should allow jpg, jpeg, png, webp", () => {
    expect(isAllowedExtension("jpg")).toBe(true);
    expect(isAllowedExtension("jpeg")).toBe(true);
    expect(isAllowedExtension("png")).toBe(true);
    expect(isAllowedExtension("webp")).toBe(true);
  });

  it("should reject other extensions", () => {
    expect(isAllowedExtension("gif")).toBe(false);
    expect(isAllowedExtension("bmp")).toBe(false);
    expect(isAllowedExtension("exe")).toBe(false);
  });

  it("should be case-insensitive", () => {
    expect(isAllowedExtension("JPG")).toBe(true);
    expect(isAllowedExtension("Png")).toBe(true);
  });
});
