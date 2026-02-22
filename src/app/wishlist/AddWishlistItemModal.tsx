"use client";

import { useState } from "react";

interface FormState {
  playerName: string;
  year: string;
  brand: string;
  setName: string;
  cardNumber: string;
  variant: string;
}

const EMPTY_FORM: FormState = {
  playerName: "",
  year: "",
  brand: "",
  setName: "",
  cardNumber: "",
  variant: "",
};

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export function AddWishlistItemModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.playerName.trim()) {
      setError("Player name is required");
      return;
    }
    setSaving(true);
    setError(null);

    const body = {
      playerName: form.playerName.trim(),
      year: form.year ? Number(form.year) : undefined,
      brand: form.brand.trim() || undefined,
      setName: form.setName.trim() || undefined,
      cardNumber: form.cardNumber.trim() || undefined,
      variant: form.variant.trim() || undefined,
    };

    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Failed to save. Please try again.");
      return;
    }
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Add to Wishlist</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { name: "playerName", label: "Player Name *", placeholder: "Rickey Henderson" },
            { name: "year", label: "Year", placeholder: "1986" },
            { name: "brand", label: "Brand", placeholder: "Topps" },
            { name: "setName", label: "Set", placeholder: "Topps Traded" },
            { name: "cardNumber", label: "Card #", placeholder: "50T" },
            { name: "variant", label: "Variant", placeholder: "Tiffany" },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {label}
              </label>
              <input
                name={name}
                value={form[name as keyof FormState]}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          ))}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add to Wishlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
