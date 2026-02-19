"use client";

import { useState, useEffect } from "react";
import { ImageUpload } from "./ImageUpload";
import { getTeamsForSport } from "@/lib/teams";

export interface CardFormData {
  playerName: string;
  year?: number;
  brand?: string;
  setName?: string;
  cardNumber?: string;
  team?: string;
  sport: string;
  variant?: string;
  condition?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  purchaseSource?: string;
  location?: string;
  imageFront?: string;
  imageBack?: string;
  notes?: string;
  tags: string[];
  imageHashes?: { hash: string; imagePath: string }[];
}

interface CardFormProps {
  onSubmit: (data: CardFormData) => void;
  initialValues?: Partial<CardFormData>;
  submitting?: boolean;
}

export function CardForm({ onSubmit, initialValues, submitting }: CardFormProps) {
  const [mounted, setMounted] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    fetch("/api/stats?include=filterOptions")
      .then((r) => r.json())
      .then((data) => setLocations(data.filterOptions?.locations ?? []))
      .catch(() => {});
  }, []);

  const [formData, setFormData] = useState<CardFormData>({
    playerName: initialValues?.playerName ?? "",
    year: initialValues?.year,
    brand: initialValues?.brand ?? "",
    setName: initialValues?.setName ?? "",
    cardNumber: initialValues?.cardNumber ?? "",
    team: initialValues?.team ?? "",
    sport: initialValues?.sport ?? "baseball",
    variant: initialValues?.variant ?? "",
    condition: initialValues?.condition ?? "",
    purchasePrice: initialValues?.purchasePrice,
    purchaseDate: initialValues?.purchaseDate ?? "",
    purchaseSource: initialValues?.purchaseSource ?? "",
    location: initialValues?.location ?? "",
    imageFront: initialValues?.imageFront ?? "",
    imageBack: initialValues?.imageBack ?? "",
    notes: initialValues?.notes ?? "",
    tags: initialValues?.tags ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [showMore, setShowMore] = useState(
    !!(initialValues?.setName || initialValues?.cardNumber || initialValues?.variant || initialValues?.location || initialValues?.notes),
  );

  async function identifyFromImage(file: File) {
    setIdentifying(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("sport", formData.sport);
      const response = await fetch("/api/identify", { method: "POST", body });
      if (!response.ok) return;
      const result = await response.json();
      setFormData((prev) => ({
        ...prev,
        playerName: result.playerName || prev.playerName,
        year: result.year ?? prev.year,
        brand: result.brand || prev.brand,
        setName: result.setName || prev.setName,
        cardNumber: result.cardNumber || prev.cardNumber,
        variant: result.variant || prev.variant,
      }));
      if (result.setName || result.cardNumber || result.variant) {
        setShowMore(true);
      }
    } catch {
      // Identification failed silently -- user can fill manually
    } finally {
      setIdentifying(false);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.playerName.trim()) {
      newErrors.playerName = "Player name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  }

  function updateField<K extends keyof CardFormData>(key: K, value: CardFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      updateField("tags", [...formData.tags, tag]);
    }
    setTagInput("");
  }

  function addImageHash(hash: string, imagePath: string) {
    setFormData((prev) => ({
      ...prev,
      imageHashes: [...(prev.imageHashes ?? []), { hash, imagePath }],
    }));
  }

  function removeTag(tag: string) {
    updateField("tags", formData.tags.filter((t) => t !== tag));
  }

  const moreFieldCount = [
    formData.setName,
    formData.cardNumber,
    formData.variant,
    formData.purchaseSource,
    formData.notes,
  ].filter((v) => v?.trim()).length;

  if (!mounted) {
    return <div className="py-12 text-center text-gray-500">Loading form...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-3 pb-4">
      {/* AI Identification Overlay */}
      {identifying && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-medium text-gray-700">Identifying card...</p>
          <p className="mt-1 text-xs text-gray-400">Analyzing image with CardSight AI</p>
        </div>
      )}

      {/* Image Upload */}
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Images</h2>
        <div className="grid grid-cols-2 gap-3">
          <ImageUpload
            label="Front"
            onUpload={(path, file, hash) => {
              updateField("imageFront", path);
              addImageHash(hash, path);
              identifyFromImage(file);
            }}
            currentImage={formData.imageFront || undefined}
          />
          <ImageUpload
            label="Back (optional)"
            onUpload={(path, _file, hash) => {
              updateField("imageBack", path);
              addImageHash(hash, path);
            }}
            currentImage={formData.imageBack || undefined}
          />
        </div>
      </section>

      {/* Card Details */}
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Card Details</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700">
              Player Name
            </label>
            <input
              id="playerName"
              type="text"
              value={formData.playerName ?? ""}
              onChange={(e) => updateField("playerName", e.target.value)}
              className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {errors.playerName && (
              <p className="mt-1 text-sm text-red-600">{errors.playerName}</p>
            )}
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700">
              Year
            </label>
            <input
              id="year"
              type="number"
              value={formData.year ?? ""}
              onChange={(e) => updateField("year", e.target.value ? Number(e.target.value) : undefined)}
              className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
              Brand
            </label>
            <input
              id="brand"
              type="text"
              value={formData.brand ?? ""}
              onChange={(e) => updateField("brand", e.target.value)}
              className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="team" className="block text-sm font-medium text-gray-700">
              Team
            </label>
            <select
              id="team"
              value={formData.team ?? ""}
              onChange={(e) => updateField("team", e.target.value)}
              className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">--</option>
              {getTeamsForSport(formData.sport).map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
              Condition
            </label>
            <select
              id="condition"
              value={formData.condition ?? ""}
              onChange={(e) => updateField("condition", e.target.value)}
              className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">--</option>
              <option value="Mint">Mint</option>
              <option value="Near Mint">Near Mint</option>
              <option value="Excellent">Excellent</option>
              <option value="Very Good">Very Good</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              id="location"
              type="text"
              list="location-options"
              value={formData.location ?? ""}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g., Box 3"
              className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <datalist id="location-options">
              {locations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>
        </div>
      </section>

      {/* Purchase Info */}
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Purchase</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
          <div>
            <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">
              Price
            </label>
            <input
              id="purchasePrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.purchasePrice ?? ""}
              onChange={(e) => updateField("purchasePrice", e.target.value ? Number(e.target.value) : undefined)}
              className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate ?? ""}
              onChange={(e) => updateField("purchaseDate", e.target.value)}
              className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

        </div>
      </section>

      {/* Tags */}
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Tags</h2>
        <div className="flex gap-2">
          <input
            id="tagInput"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Type a tag and press Enter"
            className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Add
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["batters", "pitchers", "managers"]
            .filter((t) => !formData.tags.includes(t))
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateField("tags", [...formData.tags, t])}
                className="rounded-full border border-gray-300 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                + {t}
              </button>
            ))}
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-600 hover:text-blue-900"
              >
                x
              </button>
            </span>
          ))}
        </div>
      </section>

      {/* More Details (collapsed by default, auto-opens when API fills fields) */}
      <section className="rounded-lg border border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => setShowMore((prev) => !prev)}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          <span className={`inline-block text-xs transition-transform ${showMore ? "rotate-90" : ""}`}>
            &#9654;
          </span>
          More Details
          {!showMore && moreFieldCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {moreFieldCount} filled
            </span>
          )}
        </button>
        {showMore && (
          <div className="grid grid-cols-2 gap-3 border-t border-gray-200 px-4 pb-3 pt-3 sm:grid-cols-3">
            <div>
              <label htmlFor="sport" className="block text-sm font-medium text-gray-700">
                Sport
              </label>
              <select
                id="sport"
                value={formData.sport}
                onChange={(e) => updateField("sport", e.target.value)}
                className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="baseball">Baseball</option>
                <option value="hockey">Hockey</option>
              </select>
            </div>

            <div>
              <label htmlFor="setName" className="block text-sm font-medium text-gray-700">
                Set
              </label>
              <input
                id="setName"
                type="text"
                value={formData.setName ?? ""}
                onChange={(e) => updateField("setName", e.target.value)}
                className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">
                Card Number
              </label>
              <input
                id="cardNumber"
                type="text"
                value={formData.cardNumber ?? ""}
                onChange={(e) => updateField("cardNumber", e.target.value)}
                className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="variant" className="block text-sm font-medium text-gray-700">
                Variant
              </label>
              <input
                id="variant"
                type="text"
                value={formData.variant ?? ""}
                onChange={(e) => updateField("variant", e.target.value)}
                placeholder="e.g., Refractor, Gold, Base"
                className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="purchaseSource" className="block text-sm font-medium text-gray-700">
                Source
              </label>
              <input
                id="purchaseSource"
                type="text"
                value={formData.purchaseSource ?? ""}
                onChange={(e) => updateField("purchaseSource", e.target.value)}
                placeholder="eBay, LCS, show..."
                className="block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="col-span-2 sm:col-span-3">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                rows={2}
                value={formData.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save Card"}
      </button>
    </form>
  );
}
