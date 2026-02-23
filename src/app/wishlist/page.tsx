"use client";

import { useState, useEffect, useCallback } from "react";
import { WishlistTable } from "./WishlistTable";
import { AddWishlistItemModal } from "./AddWishlistItemModal";
import { FillGapsPanel } from "./FillGapsPanel";
import type { WishlistItem } from "@/db/schema";

const PAGE_SIZE = 25;

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/wishlist");
    if (res.ok) {
      setItems(await res.json());
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  }

  function handleFilterChange(value: string) {
    setFilter(value);
    setPage(0);
  }

  const filteredItems = items.filter((item) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      item.playerName.toLowerCase().includes(q) ||
      (item.brand ?? "").toLowerCase().includes(q) ||
      (item.setName ?? "").toLowerCase().includes(q) ||
      String(item.year ?? "").includes(q)
    );
  });

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const pageItems = filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Wishlist</h1>
        <input
          type="search"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filter by player, brand, set, year…"
          className="flex-1 max-w-sm rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Card
        </button>
      </div>

      <div className="mb-2">
        <WishlistTable items={pageItems} onDelete={handleDelete} />
      </div>

      {filteredItems.length > PAGE_SIZE && (
        <div className="mb-8 flex items-center justify-between text-sm text-gray-500">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <FillGapsPanel onItemsAdded={loadItems} />

      {showAddModal && (
        <AddWishlistItemModal
          onClose={() => setShowAddModal(false)}
          onAdded={loadItems}
        />
      )}
    </main>
  );
}
