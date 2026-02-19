"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Card } from "@/db/schema";
import { groupDuplicateCards, type DuplicateGroup } from "@/lib/duplicates";

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
  addedTag: string;
}

interface NameFix {
  cardId: string;
  oldName: string;
  newName: string;
}

function TagCleanup() {
  const [tagFixes, setTagFixes] = useState<TagFix[]>([]);
  const [nameFixes, setNameFixes] = useState<NameFix[]>([]);
  const [scanned, setScanned] = useState(false);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalFixes = tagFixes.length + nameFixes.length;

  async function scan() {
    setLoading(true);
    const res = await fetch("/api/tools/fix-tags");
    const data = await res.json();
    setTagFixes(data.tagFixes);
    setNameFixes(data.nameFixes);
    setScanned(true);
    setLoading(false);
  }

  async function applyFixes() {
    setLoading(true);
    const res = await fetch("/api/tools/fix-tags", { method: "POST" });
    const data = await res.json();
    setTagFixes(data.tagFixes);
    setNameFixes(data.nameFixes);
    setApplied(true);
    setLoading(false);
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Tag Cleanup</h2>
      <p className="mb-4 text-sm text-gray-500">
        Find cards missing decade tags (1960s-1990s) or HOF tags and add them automatically.
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
          {totalFixes === 0 ? (
            <p className="text-sm text-green-600">All cards have correct names and tags.</p>
          ) : (
            <>
              <div className="mb-4 max-h-48 space-y-1 overflow-y-auto">
                {nameFixes.map((fix) => (
                  <div key={`name-${fix.cardId}`} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-700">{fix.oldName}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      → {fix.newName}
                    </span>
                  </div>
                ))}
                {tagFixes.map((fix) => (
                  <div key={`tag-${fix.cardId}-${fix.addedTag}`} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-700">{fix.playerName}</span>
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
                {loading ? "Applying..." : `Fix ${totalFixes} Cards`}
              </button>
            </>
          )}
        </>
      )}

      {applied && (
        <p className="text-sm text-green-600">
          Done! Fixed {nameFixes.length} names and {tagFixes.length} tags.
        </p>
      )}
    </div>
  );
}

function DuplicateFinder({ cards }: { cards: Card[] }) {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [scanned, setScanned] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function scan() {
    setGroups(groupDuplicateCards(cards));
    setScanned(true);
  }

  async function deleteCard(cardId: string) {
    setDeleting(true);
    const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      setConfirmingId(null);
      return;
    }

    setGroups((prev) =>
      prev
        .map((g) => ({
          ...g,
          cards: g.cards.filter((c) => c.id !== cardId),
        }))
        .filter((g) => g.cards.length >= 2),
    );
    setConfirmingId(null);
    setDeleting(false);
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        Duplicate Finder
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Find cards that share the same player, year, brand, and set.
      </p>

      {!scanned && (
        <button
          onClick={scan}
          disabled={cards.length === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
        >
          Scan for Duplicates
        </button>
      )}

      {scanned && groups.length === 0 && (
        <p className="text-sm text-green-600">
          No duplicates found — every card is unique.
        </p>
      )}

      {scanned && groups.length > 0 && (
        <>
          <p className="mb-4 text-sm text-gray-600">
            Found {groups.length} group{groups.length !== 1 && "s"} of
            potential duplicates.
          </p>
          <div className="max-h-[32rem] space-y-4 overflow-y-auto">
            {groups.map((group) => {
              const label = [
                group.playerName,
                group.year,
                group.brand,
                group.setName,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <div
                  key={label}
                  className="rounded border border-gray-200 p-3"
                >
                  <p className="mb-2 text-sm font-semibold text-gray-800">
                    {label}
                  </p>
                  <div className="space-y-2">
                    {group.cards.map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
                      >
                        {card.imageFront && (
                          <img
                            src={card.imageFront}
                            alt={card.playerName}
                            className="mr-3 h-16 w-12 shrink-0 rounded object-cover"
                          />
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {card.cardNumber && (
                            <span className="text-gray-600">
                              #{card.cardNumber}
                            </span>
                          )}
                          {card.team && (
                            <span className="text-gray-600">{card.team}</span>
                          )}
                          {card.condition && (
                            <span className="text-gray-600">
                              {card.condition}
                            </span>
                          )}
                          {card.location && (
                            <span className="text-gray-500">
                              {card.location}
                            </span>
                          )}
                          {!card.imageFront && (
                            <span className="text-amber-500">no image</span>
                          )}
                        </div>
                        <div className="ml-3 flex shrink-0 items-center gap-2">
                          <Link
                            href={`/collection/${card.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                          {confirmingId === card.id ? (
                            <>
                              <button
                                onClick={() => deleteCard(card.id)}
                                disabled={deleting}
                                className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                              >
                                {deleting ? "Deleting..." : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmingId(null)}
                                disabled={deleting}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmingId(card.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface BulkCardSummary {
  id: string;
  playerName: string;
  year: number | null;
  brand: string | null;
  team: string | null;
}

type BulkEditType = "tag" | "field";

const FIELD_OPTIONS = [
  { value: "location", label: "Location" },
  { value: "purchasePrice", label: "Price" },
  { value: "condition", label: "Condition" },
  { value: "purchaseDate", label: "Purchase Date" },
  { value: "purchaseSource", label: "Purchase Source" },
] as const;

const CONDITION_OPTIONS = [
  "Mint",
  "Near Mint",
  "Excellent",
  "Very Good",
  "Good",
  "Fair",
  "Poor",
] as const;

function BulkEdit() {
  const [editType, setEditType] = useState<BulkEditType>("tag");
  const [fieldName, setFieldName] = useState("location");
  const [tagName, setTagName] = useState("");
  const [cards, setCards] = useState<BulkCardSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [applied, setApplied] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/stats?include=filterOptions")
      .then((r) => r.json())
      .then((data) => setLocations(data.filterOptions?.locations ?? []))
      .catch(() => {});
  }, []);

  const activeName = editType === "tag" ? tagName.trim() : fieldName;

  async function findCards() {
    if (!activeName) return;
    setLoading(true);
    setFetched(false);
    setApplied(false);
    setSelected(new Set());

    const params = new URLSearchParams({ type: editType, name: activeName });
    const res = await fetch(`/api/tools/bulk-edit?${params}`);
    const data = await res.json();
    setCards(data.cards ?? []);
    setFetched(true);
    setLoading(false);

    if (editType === "tag") {
      setValue(tagName.trim());
    } else {
      setValue("");
    }
  }

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

  function toggleAll() {
    if (selected.size === cards.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cards.map((c) => c.id)));
    }
  }

  async function applyBulkEdit() {
    if (selected.size === 0 || !value.trim()) return;
    setLoading(true);

    const res = await fetch("/api/tools/bulk-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardIds: [...selected],
        type: editType,
        name: activeName,
        value: value.trim(),
      }),
    });
    const data = await res.json();
    setUpdatedCount(data.updated ?? 0);
    setApplied(true);
    setLoading(false);
  }

  function reset() {
    setCards([]);
    setSelected(new Set());
    setValue("");
    setFetched(false);
    setApplied(false);
    setUpdatedCount(0);
  }

  function renderValueInput() {
    if (fieldName === "condition" && editType === "field") {
      return (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">--</option>
          {CONDITION_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      );
    }

    if (fieldName === "purchasePrice" && editType === "field") {
      return (
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.00"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      );
    }

    if (fieldName === "purchaseDate" && editType === "field") {
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      );
    }

    if (fieldName === "location" && editType === "field") {
      return (
        <>
          <input
            type="text"
            list="bulk-location-options"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g., Box 3"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <datalist id="bulk-location-options">
            {locations.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        </>
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={editType === "tag" ? "Tag value" : "Value"}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
      />
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Bulk Edit</h2>
      <p className="mb-4 text-sm text-gray-500">
        Apply a tag or field value to multiple cards at once. Finds cards missing the chosen tag/field.
      </p>

      {!applied && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={editType}
                onChange={(e) => {
                  setEditType(e.target.value as BulkEditType);
                  reset();
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="tag">Tag</option>
                <option value="field">Field</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {editType === "tag" ? "Tag Name" : "Field"}
              </label>
              {editType === "tag" ? (
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => {
                    setTagName(e.target.value);
                    if (fetched) reset();
                  }}
                  placeholder="e.g., batters, pitchers, HOF"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              ) : (
                <select
                  value={fieldName}
                  onChange={(e) => {
                    setFieldName(e.target.value);
                    if (fetched) reset();
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {FIELD_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {!fetched && (
            <button
              onClick={findCards}
              disabled={loading || !activeName}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Find Cards"}
            </button>
          )}

          {fetched && (
            <>
              {cards.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-600">
                    No cards are missing this {editType === "tag" ? "tag" : "field"}.
                  </p>
                  <button
                    onClick={reset}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Search Again
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {cards.length} card{cards.length !== 1 && "s"} missing
                      {editType === "tag"
                        ? ` "${tagName.trim()}" tag`
                        : ` ${FIELD_OPTIONS.find((f) => f.value === fieldName)?.label}`}
                    </p>
                    <button
                      onClick={toggleAll}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      {selected.size === cards.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="mb-4 max-h-60 space-y-1 overflow-y-auto rounded border border-gray-200 p-2">
                    {cards.map((card) => (
                      <label
                        key={card.id}
                        className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(card.id)}
                          onChange={() => toggleCard(card.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="flex-1 truncate text-sm">
                          {card.playerName}
                          <span className="ml-2 text-gray-400">
                            {[card.year, card.brand, card.team].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="mb-4 max-w-xs">
                    <label className="block text-sm font-medium text-gray-700">
                      Value to Apply
                    </label>
                    {renderValueInput()}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={applyBulkEdit}
                      disabled={loading || selected.size === 0 || !value.trim()}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                    >
                      {loading
                        ? "Applying..."
                        : `Apply to ${selected.size} Card${selected.size !== 1 ? "s" : ""}`}
                    </button>
                    <button
                      onClick={reset}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Reset
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {applied && (
        <div className="space-y-3">
          <p className="text-sm text-green-600">
            Updated {updatedCount} card{updatedCount !== 1 && "s"}.
          </p>
          <button
            onClick={reset}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Do Another
          </button>
        </div>
      )}
    </div>
  );
}

function TagRename() {
  const [fromTag, setFromTag] = useState("");
  const [toTag, setToTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRename() {
    if (!fromTag.trim() || !toTag.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/tools/rename-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromTag: fromTag.trim(), toTag: toTag.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rename failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFromTag("");
    setToTag("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Rename Tag</h2>
      <p className="mb-4 text-sm text-gray-500">
        Replace one tag with another across all cards that have it.
      </p>

      {!result && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="fromTag" className="block text-sm font-medium text-gray-700">
                From
              </label>
              <input
                id="fromTag"
                type="text"
                value={fromTag}
                onChange={(e) => setFromTag(e.target.value)}
                placeholder="e.g., first basemen"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="toTag" className="block text-sm font-medium text-gray-700">
                To
              </label>
              <input
                id="toTag"
                type="text"
                value={toTag}
                onChange={(e) => setToTag(e.target.value)}
                placeholder="e.g., 1b"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="mb-3 text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleRename}
            disabled={loading || !fromTag.trim() || !toTag.trim() || fromTag.trim() === toTag.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Renaming..." : "Rename Tag"}
          </button>
        </>
      )}

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-green-600">
            {result.updated === 0
              ? `No cards found with tag "${fromTag.trim()}".`
              : `Renamed "${fromTag.trim()}" to "${toTag.trim()}" on ${result.updated} card${result.updated !== 1 ? "s" : ""}.`}
          </p>
          <button
            onClick={reset}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Do Another
          </button>
        </div>
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
        Find cards missing important fields: price, condition, purchase date, team, front image, or position tag (batter/pitcher/manager).
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

// TODO: Remove this component once the one-time backfill is done.
function QuickBackfill() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const JOBS = [
    { year: 1990, brand: "Topps", price: 0.02, date: "2026-01-27" },
    { year: 1988, brand: "Donruss", price: 0.02, date: "2026-02-05" },
  ] as const;

  async function run() {
    setLoading(true);
    const res = await fetch("/api/cards?sortBy=playerName&sortOrder=asc");
    const allCards = await res.json() as { id: string; year: number | null; brand: string | null; purchasePrice: number | null; purchaseDate: string | null; purchaseSource: string | null }[];

    let total = 0;
    for (const job of JOBS) {
      const matches = allCards.filter(
        (c) => c.year === job.year && c.brand?.toLowerCase() === job.brand.toLowerCase(),
      );
      for (const card of matches) {
        const updates: Record<string, unknown> = {};
        if (card.purchasePrice == null) updates.purchasePrice = job.price;
        if (!card.purchaseDate) updates.purchaseDate = job.date;
        if (!card.purchaseSource) updates.purchaseSource = "Facebook Marketplace";
        if (Object.keys(updates).length === 0) continue;

        await fetch(`/api/cards/${card.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        total++;
      }
    }

    setResult(`Done! Updated ${total} card${total !== 1 ? "s" : ""}.`);
    setLoading(false);
  }

  if (result) {
    return (
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Quick Backfill</h2>
        <p className="text-sm text-green-600">{result}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Quick Backfill</h2>
      <p className="mb-1 text-sm text-gray-500">
        One-time fill for cards missing price/date/source:
      </p>
      <ul className="mb-4 list-inside list-disc text-sm text-gray-600">
        <li>1990 Topps &rarr; $0.02, Jan 27 2026, Facebook Marketplace</li>
        <li>1988 Donruss &rarr; $0.02, Feb 5 2026, Facebook Marketplace</li>
      </ul>
      <p className="mb-4 text-xs text-amber-600">
        Only fills missing values — existing prices, dates, and sources are left alone.
      </p>
      <button
        onClick={run}
        disabled={loading}
        className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-50"
      >
        {loading ? "Running..." : "Run Backfill"}
      </button>
    </div>
  );
}

type ToolsTab = "audit" | "bulk" | "export";

const TABS: { key: ToolsTab; label: string }[] = [
  { key: "audit", label: "Audit & Cleanup" },
  { key: "bulk", label: "Bulk Operations" },
  { key: "export", label: "Export & Listings" },
];

export default function ToolsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [activeTab, setActiveTab] = useState<ToolsTab>("audit");

  useEffect(() => {
    fetch("/api/cards?sortBy=playerName&sortOrder=asc")
      .then((r) => r.json())
      .then(setCards);
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Tools</h1>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? "border-b-2 border-blue-600 font-semibold text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {activeTab === "audit" && (
          <>
            <DataAudit />
            <TagCleanup />
            <DuplicateFinder cards={cards} />
          </>
        )}

        {activeTab === "bulk" && (
          <>
            <BulkEdit />
            <TagRename />
            {/* TODO: Remove once backfill is done */}
            <QuickBackfill />
          </>
        )}

        {activeTab === "export" && (
          <>
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
            <LotBuilder cards={cards} />
          </>
        )}
      </div>
    </div>
  );
}
