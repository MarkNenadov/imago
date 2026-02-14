import { describe, it, expect } from "vitest";
import { getDb } from "@/db";

describe("database connection", () => {
  it("should connect and return a database instance", () => {
    const db = getDb(":memory:");
    expect(db).toBeDefined();
  });
});
