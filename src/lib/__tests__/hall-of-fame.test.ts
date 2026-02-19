import { describe, it, expect } from "vitest";
import { normalizePlayerName, isHallOfFamer } from "@/lib/hall-of-fame";

describe("normalizePlayerName", () => {
  it("should add period to Jr without one", () => {
    expect(normalizePlayerName("Cal Ripken Jr")).toBe("Cal Ripken Jr.");
  });

  it("should not double the period on Jr.", () => {
    expect(normalizePlayerName("Cal Ripken Jr.")).toBe("Cal Ripken Jr.");
  });

  it("should add period to Sr without one", () => {
    expect(normalizePlayerName("Ken Griffey Sr")).toBe("Ken Griffey Sr.");
  });

  it("should not double the period on Sr.", () => {
    expect(normalizePlayerName("Ken Griffey Sr.")).toBe("Ken Griffey Sr.");
  });

  it("should leave names without suffixes unchanged", () => {
    expect(normalizePlayerName("Hank Aaron")).toBe("Hank Aaron");
  });
});

describe("isHallOfFamer", () => {
  it("should match with Jr. suffix", () => {
    expect(isHallOfFamer("Cal Ripken Jr.")).toBe(true);
  });

  it("should match with Jr suffix (no period)", () => {
    expect(isHallOfFamer("Cal Ripken Jr")).toBe(true);
  });

  it("should match case-insensitively", () => {
    expect(isHallOfFamer("cal ripken jr.")).toBe(true);
  });

  it("should match alternate name Rock Raines for Tim Raines", () => {
    expect(isHallOfFamer("Rock Raines")).toBe(true);
  });
});
