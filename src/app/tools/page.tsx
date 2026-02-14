"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Card } from "@/db/schema";

type LotStep = "select" | "generating" | "results";

interface LotResult {
  images: string[];
  title: string;
  description: string;
}

function CardSelector({
  cards,
  selected,
  onToggle,
}: {
  cards: Card[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter(
      (c) =>
        c.playerName.toLowerCase().includes(q) ||
        c.team?.toLowerCase().includes(q) ||
        c.brand?.toLowerCase().includes(q),
    );
  }, [cards, search]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search cards..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {filtered.map((card) => (
          <label
            key={card.id}
            className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selected.has(card.id)}
              onChange={() => onToggle(card.id)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="flex-1 truncate text-sm">
              {card.playerName}
              <span className="ml-2 text-gray-400">
                {[card.year, card.brand].filter(Boolean).join(" ")}
              </span>
            </span>
            {!card.imageFront && (
              <span className="text-xs text-amber-500">no image</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function LotBuilder({ cards }: { cards: Card[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<LotStep>("select");
  const [result, setResult] = useState<LotResult | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedWithImages = useMemo(
    () => cards.filter((c) => selected.has(c.id) && c.imageFront),
    [cards, selected],
  );

  function toggleCard(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function generateLot() {
    const ids = [...selected];
    setStep("generating");

    const [stitchRes, descRes] = await Promise.all([
      fetch("/api/tools/stitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: ids }),
      }),
      fetch("/api/tools/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: ids }),
      }),
    ]);

    const stitchData = await stitchRes.json();
    const descData = await descRes.json();

    setResult({
      images: stitchData.images ?? [],
      title: descData.title ?? "",
      description: descData.description ?? "",
    });
    setStep("results");
  }

  function reset() {
    setSelected(new Set());
    setStep("select");
    setResult(null);
    setCopied(false);
  }

  async function copyDescription() {
    if (!result) return;
    await navigator.clipboard.writeText(`${result.title}\n\n${result.description}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Lot Builder</h2>
      <p className="mb-4 text-sm text-gray-500">
        Select cards to create composite images and a marketplace listing description.
      </p>

      {step === "select" && (
        <>
          <CardSelector
            cards={cards}
            selected={selected}
            onToggle={toggleCard}
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {selected.size} selected ({selectedWithImages.length} with images)
            </p>
            <button
              onClick={generateLot}
              disabled={selected.size === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              Generate Lot
            </button>
          </div>
        </>
      )}

      {step === "generating" && (
        <div className="py-8 text-center text-gray-500">
          Generating composite images and description...
        </div>
      )}

      {step === "results" && result && (
        <div className="space-y-6">
          {result.images.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                Composite Images ({result.images.length})
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {result.images.map((src, i) => (
                  <a
                    key={i}
                    href={src}
                    download
                    className="block overflow-hidden rounded-lg border border-gray-200 hover:shadow-md"
                  >
                    <img
                      src={src}
                      alt={`Lot composite ${i + 1}`}
                      className="w-full"
                    />
                    <p className="bg-gray-50 px-3 py-1.5 text-center text-xs text-blue-600">
                      Click to download
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Listing Description
              </h3>
              <button
                onClick={copyDescription}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 font-semibold text-gray-900">{result.title}</p>
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {result.description}
              </pre>
            </div>
          </div>

          <button
            onClick={reset}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}

interface TagFix {
  cardId: string;
  playerName: string;
  year: number;
  addedTag: string;
}

function TagCleanup() {
  const [fixes, setFixes] = useState<TagFix[]>([]);
  const [scanned, setScanned] = useState(false);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function scan() {
    setLoading(true);
    const res = await fetch("/api/tools/fix-tags");
    const data = await res.json();
    setFixes(data.fixes);
    setScanned(true);
    setLoading(false);
  }

  async function applyFixes() {
    setLoading(true);
    const res = await fetch("/api/tools/fix-tags", { method: "POST" });
    const data = await res.json();
    setFixes(data.fixes);
    setApplied(true);
    setLoading(false);
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Tag Cleanup</h2>
      <p className="mb-4 text-sm text-gray-500">
        Find cards missing decade tags (1960s-1990s) and add them automatically.
      </p>

      {!scanned && (
        <button
          onClick={scan}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Scanning..." : "Scan for Missing Tags"}
        </button>
      )}

      {scanned && !applied && (
        <>
          {fixes.length === 0 ? (
            <p className="text-sm text-green-600">All cards have correct decade tags.</p>
          ) : (
            <>
              <div className="mb-4 max-h-48 space-y-1 overflow-y-auto">
                {fixes.map((fix) => (
                  <div key={fix.cardId} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-700">{fix.playerName} ({fix.year})</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      + {fix.addedTag}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={applyFixes}
                disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Applying..." : `Fix ${fixes.length} Cards`}
              </button>
            </>
          )}
        </>
      )}

      {applied && (
        <p className="text-sm text-green-600">
          Done! Added decade tags to {fixes.length} cards.
        </p>
      )}
    </div>
  );
}

interface IncompleteCard {
  id: string;
  playerName: string;
  missing: string[];
}

function DataAudit() {
  const [cards, setCards] = useState<IncompleteCard[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  async function scan() {
    setLoading(true);
    const res = await fetch("/api/tools/audit");
    const data = await res.json();
    setCards(data.cards);
    setTotalCards(data.totalCards);
    setScanned(true);
    setLoading(false);
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Data Audit</h2>
      <p className="mb-4 text-sm text-gray-500">
        Find cards missing important fields: price, condition, purchase date, team, or front image.
      </p>

      {!scanned && (
        <button
          onClick={scan}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Scanning..." : "Run Audit"}
        </button>
      )}

      {scanned && (
        <>
          <p className="mb-4 text-sm text-gray-600">
            {cards.length === 0
              ? "All cards have complete data!"
              : `${cards.length} of ${totalCards} cards have missing fields.`}
          </p>
          {cards.length > 0 && (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between rounded border border-gray-100 px-3 py-2"
                >
                  <div>
                    <Link
                      href={`/collection/${card.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {card.playerName}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {card.missing.map((field) => (
                        <span
                          key={field}
                          className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/collection/${card.id}`}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ToolsPage() {
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    fetch("/api/cards?sortBy=playerName&sortOrder=asc")
      .then((r) => r.json())
      .then(setCards);
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Tools</h1>

      <div className="space-y-8">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">CSV Export</h2>
          <p className="mb-4 text-sm text-gray-500">
            Download your entire collection as a CSV spreadsheet.
          </p>
          <a
            href="/api/tools/csv"
            download
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Export CSV
          </a>
        </div>

        <TagCleanup />

        <DataAudit />

        <LotBuilder cards={cards} />
      </div>
    </div>
  );
}
