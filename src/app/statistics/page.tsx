"use client";

import { useState, useEffect } from "react";

interface Stats {
  totalCards: number;
  totalImages: number;
  distinctPlayers: number;
  totalInvested: number;
  imageStorageMb: number;
  bySport: Record<string, number>;
  byTeam: Record<string, number>;
  byYear: Record<string, number>;
  byBrand: Record<string, number>;
  byEntryMonth: Record<string, number>;
  byDecade: Record<string, number>;
  rookieVsNon: Record<string, number>;
  batterVsPitcher: Record<string, number>;
  hofVsNon: Record<string, number>;
}

function BarChart({ data, label, presorted = false }: { data: Record<string, number>; label: string; presorted?: boolean }) {
  const entries = presorted
    ? Object.entries(data)
    : Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">No data yet</p>;
  }

  const max = Math.max(...entries.map(([, v]) => v));

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-700">By {label}</h3>
      <div className="space-y-2">
        {entries.map(([name, count]) => (
          <div key={name} className="flex items-center gap-3">
            <span className="w-36 truncate text-right text-xs text-gray-600">{name}</span>
            <div className="flex-1">
              <div
                className="h-5 rounded bg-blue-500"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium text-gray-700">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollapsibleBarChart({ data, label, previewCount = 5 }: { data: Record<string, number>; label: string; previewCount?: number }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">No data yet</p>;
  }

  const visible = expanded ? entries : entries.slice(0, previewCount);
  const max = Math.max(...entries.map(([, v]) => v));
  const remaining = entries.length - previewCount;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-700">By {label}</h3>
      <div className="space-y-2">
        {visible.map(([name, count]) => (
          <div key={name} className="flex items-center gap-3">
            <span className="w-36 truncate text-right text-xs text-gray-600">{name}</span>
            <div className="flex-1">
              <div
                className="h-5 rounded bg-blue-500"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium text-gray-700">{count}</span>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {expanded ? "Show less" : `Show all ${entries.length} teams`}
        </button>
      )}
    </div>
  );
}

function sortByKey(data: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(data).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return <div className="py-12 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Statistics</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
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
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Photo Storage</p>
          <p className="text-2xl font-bold text-gray-900">{stats.imageStorageMb.toFixed(1)} MB</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <BarChart data={stats.bySport} label="Sport" />
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <CollapsibleBarChart data={stats.byTeam} label="Team" previewCount={10} />
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <BarChart data={sortByKey(stats.byYear)} label="Year" presorted />
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <BarChart data={stats.byBrand} label="Brand" />
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <BarChart data={sortByKey(stats.byEntryMonth)} label="Entry Month" presorted />
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <BarChart data={sortByKey(stats.byDecade)} label="Decade" presorted />
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <BarChart data={stats.rookieVsNon} label="Rookie Status" />
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <BarChart data={stats.batterVsPitcher} label="Position Type" />
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <BarChart data={stats.hofVsNon} label="Hall of Fame Status" />
        </div>
      </div>
    </div>
  );
}
