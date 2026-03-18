"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { CardGallery } from "@/components/CardGallery";
import { CardTable } from "@/components/CardTable";
import { CollectionFilters, type FiltersState } from "@/components/CollectionFilters";
import type { Card } from "@/db/schema";

type ViewMode = "gallery" | "list";

const PAGE_SIZE = 25;

function CollectionContent() {
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersState>({
    sport: searchParams.get("sport") ?? "",
    location: searchParams.get("location") ?? "",
    brand: searchParams.get("brand") ?? "",
    team: searchParams.get("team") ?? "",
    tag: searchParams.get("tag") ?? "",
    setName: searchParams.get("setName") ?? "",
    year: searchParams.get("year") ?? "",
    q: searchParams.get("q") ?? "",
    sortBy: searchParams.get("sortBy") ?? "createdAt",
    sortOrder: searchParams.get("sortOrder") ?? "desc",
  });

  const totalPages = Math.max(1, Math.ceil(totalCards / PAGE_SIZE));

  const fetchCards = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));
    if (filters.q) params.set("q", filters.q);
    if (filters.sport) params.set("sport", filters.sport);
    if (filters.location) params.set("location", filters.location);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.team) params.set("team", filters.team);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.setName) params.set("setName", filters.setName);
    if (filters.year) params.set("year", filters.year);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

    const response = await fetch(`/api/cards?${params}`);
    const data = await response.json();
    setCards(data.cards);
    setTotalCards(data.total);
    setTotalCost(data.totalCost ?? 0);
    setLoading(false);
  }, [filters, page]);

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
          <CollectionFilters
            filters={filters}
            onChange={(f) => {
              setFilters(f);
              setPage(1);
            }}
          />
        </aside>

        <div>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : (
            <>
              <p className="mb-3 text-sm text-gray-500">
                {totalCards} card{totalCards !== 1 ? "s" : ""}
                {totalCost > 0 && ` · $${totalCost.toFixed(2)} invested`}
                {totalPages > 1 && ` — page ${page} of ${totalPages}`}
              </p>

              {viewMode === "gallery" ? (
                <CardGallery cards={cards} />
              ) : (
                <CardTable cards={cards} />
              )}

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .reduce<(number | "...")[]>((acc, p) => {
                      const last = acc[acc.length - 1];
                      if (typeof last === "number" && p - last > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                            p === page
                              ? "bg-blue-600 text-white"
                              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
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
