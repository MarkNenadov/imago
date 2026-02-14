"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Card } from "@/db/schema";

interface Stats {
  totalCards: number;
  totalImages: number;
  distinctPlayers: number;
  totalInvested: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCards, setRecentCards] = useState<Card[]>([]);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
    fetch("/api/cards?sortBy=createdAt&sortOrder=desc")
      .then((r) => r.json())
      .then((cards: Card[]) => setRecentCards(cards.slice(0, 4)));
  }, []);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Cards</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCards}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Images</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalImages}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Players</p>
            <p className="text-2xl font-bold text-gray-900">{stats.distinctPlayers}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Invested</p>
            <p className="text-2xl font-bold text-gray-900">${stats.totalInvested.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Recent Cards */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recently Added</h2>
        {recentCards.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-sm">
            <p>No cards yet. Add your first card to get started!</p>
            <Link
              href="/add"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Add Card
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentCards.map((card) => (
              <Link
                key={card.id}
                href={`/collection/${card.id}`}
                className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm hover:shadow-md"
              >
                <div className="aspect-[2.5/3.5] overflow-hidden rounded bg-gray-100">
                  {card.imageFront ? (
                    <img
                      src={card.imageFront}
                      alt={card.playerName}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{card.playerName}</p>
                <p className="truncate text-xs text-gray-500">
                  {[card.year, card.brand].filter(Boolean).join(" ")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
