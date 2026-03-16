"use client";

import { useState, useEffect } from "react";

interface FiltersState {
  sport: string;
  location: string;
  brand: string;
  team: string;
  tag: string;
  setName: string;
  q: string;
  sortBy: string;
  sortOrder: string;
}

interface CollectionFiltersProps {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
}

export type { FiltersState };

export function CollectionFilters({ filters, onChange }: CollectionFiltersProps) {
  const [brands, setBrands] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [setNames, setSetNames] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    fetch("/api/stats?include=filterOptions")
      .then((res) => res.json())
      .then((data) => {
        setBrands(data.filterOptions?.brands ?? []);
        setLocations(data.filterOptions?.locations ?? []);
        setSetNames(data.filterOptions?.setNames ?? []);
        setTeams(data.filterOptions?.teams ?? []);
        setTags(data.filterOptions?.tags ?? []);
      });
  }, []);

  // Auto-expand when a "more" filter is active
  useEffect(() => {
    if (filters.setName || filters.location) {
      setMoreOpen(true);
    }
  }, [filters.setName, filters.location]);

  function update(key: keyof FiltersState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const moreFilterCount =
    (filters.setName ? 1 : 0) + (filters.location ? 1 : 0);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <input
          type="text"
          placeholder="Search cards..."
          value={filters.q}
          onChange={(e) => update("q", e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Sport</label>
        <select
          value={filters.sport}
          onChange={(e) => update("sport", e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        >
          <option value="">All</option>
          <option value="baseball">Baseball</option>
          <option value="hockey">Hockey</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Brand</label>
        <select
          value={filters.brand}
          onChange={(e) => update("brand", e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        >
          <option value="">All</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Team</label>
        <select
          value={filters.team}
          onChange={(e) => update("team", e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        >
          <option value="">All</option>
          {teams.map((team) => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Tag</label>
        <select
          value={filters.tag}
          onChange={(e) => update("tag", e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        >
          <option value="">All</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setMoreOpen((prev) => !prev)}
          className="flex w-full items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          <span>
            More Filters
            {!moreOpen && moreFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                {moreFilterCount}
              </span>
            )}
          </span>
          <svg
            className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {moreOpen && (
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500">Set</label>
              <select
                value={filters.setName}
                onChange={(e) => update("setName", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
              >
                <option value="">All</option>
                {setNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500">Location</label>
              <select
                value={filters.location}
                onChange={(e) => update("location", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
              >
                <option value="">All</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      <div>
        <label className="block text-xs font-medium text-gray-500">Sort By</label>
        <select
          value={filters.sortBy}
          onChange={(e) => update("sortBy", e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        >
          <option value="createdAt">Date Added</option>
          <option value="players">Player Name</option>
          <option value="year">Year</option>
          <option value="brand">Brand</option>
          <option value="purchasePrice">Purchase Price</option>
          <option value="location">Location</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Order</label>
        <select
          value={filters.sortOrder}
          onChange={(e) => update("sortOrder", e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        >
          <option value="asc">A-Z / Low-High</option>
          <option value="desc">Z-A / High-Low</option>
        </select>
      </div>

    </div>
  );
}
