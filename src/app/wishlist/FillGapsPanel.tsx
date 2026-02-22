"use client";

import { useState } from "react";
import type { CatalogCard } from "@/lib/card-catalog";

interface Props {
  onItemsAdded: () => void;
}

export function FillGapsPanel({ onItemsAdded }: Props) {
  const [player, setPlayer] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [sport, setSport] = useState("baseball");
  const [results, setResults] = useState<CatalogCard[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!player.trim()) return;
    setSearching(true);
    setStatusMessage(null);
    setResults([]);
    setSelected(new Set());

    const params = new URLSearchParams({ player: player.trim(), sport });
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);

    const res = await fetch(`/api/wishlist/catalog-search?${params.toString()}`);
    setSearching(false);

    if (!res.ok) {
      setStatusMessage("Catalog search unavailable. Try again later.");
      return;
    }

    const data: CatalogCard[] = await res.json();
    setResults(data);
    setSelected(new Set(data.map((_, i) => i)));

    if (data.length === 0) {
      setStatusMessage("No gaps found for this player and year range.");
    }
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  async function handleAddSelected() {
    const toAdd = results.filter((_, i) => selected.has(i));
    if (toAdd.length === 0) return;
    setAdding(true);

    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toAdd),
    });

    setAdding(false);
    if (!res.ok) {
      setStatusMessage("Failed to add items. Please try again.");
      return;
    }

    setResults([]);
    setSelected(new Set());
    setStatusMessage(`Added ${toAdd.length} card${toAdd.length !== 1 ? "s" : ""} to wishlist.`);
    onItemsAdded();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Fill Gaps</h2>
      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Player</label>
          <input
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            placeholder="Rickey Henderson"
            className="w-48 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Year from</label>
          <input
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder="1982"
            className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Year to</label>
          <input
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            placeholder="1988"
            className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Sport</label>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="baseball">Baseball</option>
            <option value="hockey">Hockey</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={searching || !player.trim()}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {statusMessage && (
        <p className="mt-3 text-sm text-gray-500">{statusMessage}</p>
      )}

      {results.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {selected.size} of {results.length} selected
            </span>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={adding || selected.size === 0}
              className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
            >
              {adding ? "Adding…" : `Add ${selected.size} to Wishlist`}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {results.map((card, i) => (
              <label
                key={`${card.playerName}-${card.year ?? ""}-${card.cardNumber ?? ""}-${i}`}
                className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-white"
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggleSelect(i)}
                  className="h-4 w-4"
                />
                <span className="text-sm">
                  <span className="font-medium">{card.playerName}</span>
                  {card.year && <span className="ml-2 text-gray-500">{card.year}</span>}
                  {card.brand && <span className="ml-2 text-gray-400">{card.brand}</span>}
                  {card.setName && <span className="ml-1 text-gray-400">— {card.setName}</span>}
                  {card.cardNumber && <span className="ml-1 text-gray-400">#{card.cardNumber}</span>}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
