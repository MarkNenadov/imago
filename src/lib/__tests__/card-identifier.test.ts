import { describe, it, expect } from "vitest";
import { isIdentificationAvailable } from "@/lib/card-identifier";

describe("card identifier", () => {
  it("should report unavailable when no API key is configured", () => {
    const available = isIdentificationAvailable();
    expect(available).toBe(false);
  });
});
