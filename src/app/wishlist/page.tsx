"use client";

import { useState, useEffect, useCallback } from "react";
import { WishlistTable } from "./WishlistTable";
import { AddWishlistItemModal } from "./AddWishlistItemModal";
import { FillGapsPanel } from "./FillGapsPanel";
import type { WishlistItem } from "@/db/schema";

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

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
    await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Wishlist</h1>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Card
        </button>
      </div>

      <div className="mb-8">
        <WishlistTable items={items} onDelete={handleDelete} />
      </div>

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
