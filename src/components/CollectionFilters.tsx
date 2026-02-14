"use client";

import { useState, useEffect } from "react";

interface FiltersState {
  sport: string;
  location: string;
  brand: string;
  team: string;
  tag: string;
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
  const [teams, setTeams] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/stats?include=filterOptions")
      .then((res) => res.json())
      .then((data) => {
        setBrands(data.filterOptions?.brands ?? []);
        setTeams(data.filterOptions?.teams ?? []);
        setTags(data.filterOptions?.tags ?? []);
      });
  }, []);

  function update(key: keyof FiltersState, value: string) {
    onChange({ ...filters, [key]: value });
  }

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
        <label className="block text-xs font-medium text-gray-500">Location</label>
        <input
          type="text"
          value={filters.location}
          onChange={(e) => update("location", e.target.value)}
          placeholder="e.g., Box 3"
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        />
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

      <hr className="border-gray-200" />

      <div>
        <label className="block text-xs font-medium text-gray-500">Sort By</label>
        <select
          value={filters.sortBy}
          onChange={(e) => update("sortBy", e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        >
          <option value="">Date Added</option>
          <option value="playerName">Player Name</option>
          <option value="year">Year</option>
          <option value="brand">Brand</option>
          <option value="team">Team</option>
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
