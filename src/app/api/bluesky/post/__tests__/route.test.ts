import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/bluesky/post/route";
import { NextRequest } from "next/server";

const { mockReadFile, mockSharp, mockToBuffer, mockLogin, mockUploadBlob, mockPost } = vi.hoisted(() => {
  const mockToBuffer = vi.fn().mockResolvedValue(Buffer.from("compressed"));
  // Fluent chain: every method returns the same chain object
  const chain: Record<string, unknown> = {};
  chain.rotate = vi.fn().mockReturnValue(chain);
  chain.resize = vi.fn().mockReturnValue(chain);
  chain.jpeg = vi.fn().mockReturnValue(chain);
  chain.toBuffer = mockToBuffer;
  const mockSharp = vi.fn().mockReturnValue(chain);

  return {
    mockReadFile: vi.fn().mockResolvedValue(Buffer.from("img")),
    mockSharp,
    mockToBuffer,
    mockLogin: vi.fn().mockResolvedValue({}),
    mockUploadBlob: vi.fn().mockResolvedValue({ data: { blob: { ref: "blob-ref" } } }),
    mockPost: vi.fn().mockResolvedValue({ uri: "at://did/app.bsky.feed.post/123" }),
  };
});

vi.mock("@/db", () => ({ getDb: vi.fn() }));
vi.mock("@/db/cards", () => ({ getCardById: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));
vi.mock("sharp", () => ({ default: mockSharp }));
vi.mock("@atproto/api", () => ({
  AtpAgent: vi.fn().mockImplementation(function () {
    return { login: mockLogin, uploadBlob: mockUploadBlob, post: mockPost };
  }),
  RichText: vi.fn().mockImplementation(function ({ text }: { text: string }) {
    return { text, facets: [], detectFacets: vi.fn().mockResolvedValue(undefined) };
  }),
}));

import { getCardById } from "@/db/cards";
const mockGetCardById = vi.mocked(getCardById);

function makeCard(overrides = {}) {
  return {
    id: "card-1",
    players: [{ name: "Ken Griffey Jr.", team: "Seattle Mariners" }],
    year: 1989,
    brand: "Upper Deck",
    setName: "Base Set",
    cardNumber: "1",
    sport: "baseball",
    variant: null,
    condition: null,
    purchasePrice: null,
    purchaseDate: null,
    purchaseSource: null,
    location: null,
    imageFront: "/uploads/front.jpg",
    imageBack: null,
    notes: null,
    tags: [],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/bluesky/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockReadFile.mockReset().mockResolvedValue(Buffer.from("img"));
  mockToBuffer.mockReset().mockResolvedValue(Buffer.from("compressed"));
  mockLogin.mockReset().mockResolvedValue({});
  mockUploadBlob.mockReset().mockResolvedValue({ data: { blob: { ref: "blob-ref" } } });
  mockPost.mockReset().mockResolvedValue({ uri: "at://did/app.bsky.feed.post/123" });
  mockGetCardById.mockReset();
  delete process.env.BSKY_HANDLE;
  delete process.env.BSKY_APP_PASSWORD;
});

describe("POST /api/bluesky/post", () => {
  it("returns 503 when credentials are not configured", async () => {
    const res = await POST(makeRequest({ cardId: "card-1", text: "hello" }));
    expect(res.status).toBe(503);
  });

  it("returns 400 when cardId is missing", async () => {
    process.env.BSKY_HANDLE = "test.bsky.social";
    process.env.BSKY_APP_PASSWORD = "app-pass";
    const res = await POST(makeRequest({ text: "hello" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is missing", async () => {
    process.env.BSKY_HANDLE = "test.bsky.social";
    process.env.BSKY_APP_PASSWORD = "app-pass";
    const res = await POST(makeRequest({ cardId: "card-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when card is not found", async () => {
    process.env.BSKY_HANDLE = "test.bsky.social";
    process.env.BSKY_APP_PASSWORD = "app-pass";
    mockGetCardById.mockReturnValue(undefined);
    const res = await POST(makeRequest({ cardId: "missing", text: "hello" }));
    expect(res.status).toBe(404);
  });

  it("returns 422 when card has no front image", async () => {
    process.env.BSKY_HANDLE = "test.bsky.social";
    process.env.BSKY_APP_PASSWORD = "app-pass";
    mockGetCardById.mockReturnValue(makeCard({ imageFront: null }));
    const res = await POST(makeRequest({ cardId: "card-1", text: "hello" }));
    expect(res.status).toBe(422);
  });

  it("returns 200 with uri on success", async () => {
    process.env.BSKY_HANDLE = "test.bsky.social";
    process.env.BSKY_APP_PASSWORD = "app-pass";
    mockGetCardById.mockReturnValue(makeCard());
    const res = await POST(makeRequest({ cardId: "card-1", text: "hello" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, uri: "at://did/app.bsky.feed.post/123" });
  });

  it("returns 502 when image cannot be compressed small enough", async () => {
    process.env.BSKY_HANDLE = "test.bsky.social";
    process.env.BSKY_APP_PASSWORD = "app-pass";
    mockGetCardById.mockReturnValue(makeCard());

    // Every compression attempt returns a buffer that is too large
    mockToBuffer.mockResolvedValue(Buffer.alloc(1_000_000));

    const res = await POST(makeRequest({ cardId: "card-1", text: "hello" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("compressed small enough");
  });

  it("returns 502 when Bluesky login throws", async () => {
    process.env.BSKY_HANDLE = "test.bsky.social";
    process.env.BSKY_APP_PASSWORD = "app-pass";
    mockGetCardById.mockReturnValue(makeCard());
    mockLogin.mockRejectedValueOnce(new Error("auth failed"));
    const res = await POST(makeRequest({ cardId: "card-1", text: "hello" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("auth failed");
  });
});
