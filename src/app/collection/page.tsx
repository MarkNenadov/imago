"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { CardGallery } from "@/components/CardGallery";
import { CardTable } from "@/components/CardTable";
import { CollectionFilters, type FiltersState } from "@/components/CollectionFilters";
import type { Card } from "@/db/schema";

type ViewMode = "gallery" | "list";

function CollectionContent() {
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersState>({
    sport: searchParams.get("sport") ?? "",
    location: searchParams.get("location") ?? "",
    brand: searchParams.get("brand") ?? "",
    team: searchParams.get("team") ?? "",
    tag: searchParams.get("tag") ?? "",
    q: searchParams.get("q") ?? "",
    sortBy: searchParams.get("sortBy") ?? "",
    sortOrder: searchParams.get("sortOrder") ?? "asc",
  });

  const fetchCards = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.sport) params.set("sport", filters.sport);
    if (filters.location) params.set("location", filters.location);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.team) params.set("team", filters.team);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortBy) params.set("sortOrder", filters.sortOrder);

    const response = await fetch(`/api/cards?${params}`);
    const data = await response.json();
    setCards(data);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Collection</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("gallery")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === "gallery" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Gallery
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <CollectionFilters filters={filters} onChange={setFilters} />
        </aside>

        <div>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : viewMode === "gallery" ? (
            <CardGallery cards={cards} />
          ) : (
            <CardTable cards={cards} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500">Loading...</div>}>
      <CollectionContent />
    </Suspense>
  );
}
