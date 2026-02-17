"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CardForm, type CardFormData } from "@/components/CardForm";
import type { Card } from "@/db/schema";

function nullsToUndefined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === null ? undefined : v]),
  );
}

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/cards/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Card not found");
        return res.json();
      })
      .then(setCard)
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleUpdate(data: CardFormData) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Update failed");
      const updated = await response.json();
      setCard(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      const response = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      router.push("/collection");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (error && !card) {
    return <div className="py-12 text-center text-red-600">{error}</div>;
  }

  if (!card) {
    return <div className="py-12 text-center text-gray-500">Loading...</div>;
  }

  if (editing) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit Card</h1>
          <button
            onClick={() => setEditing(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
        <CardForm onSubmit={handleUpdate} initialValues={nullsToUndefined(card)} submitting={submitting} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{card.playerName}</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Are you sure you want to delete this card? This cannot be undone.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleDelete}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          {card.imageFront ? (
            <img
              src={card.imageFront}
              alt={`${card.playerName} front`}
              className="w-full rounded-lg shadow-sm"
            />
          ) : (
            <div className="flex aspect-[2.5/3.5] items-center justify-center rounded-lg bg-gray-100 text-gray-400">
              No front image
            </div>
          )}
          {card.imageBack && (
            <img
              src={card.imageBack}
              alt={`${card.playerName} back`}
              className="w-full rounded-lg shadow-sm"
            />
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Card Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Card Info</h2>
            <div className="grid grid-cols-3 gap-3">
              {card.year && (
                <div>
                  <p className="text-xs text-gray-500">Year</p>
                  <p className="text-sm font-medium text-gray-900">{card.year}</p>
                </div>
              )}
              {card.brand && (
                <div>
                  <p className="text-xs text-gray-500">Brand</p>
                  <p className="text-sm font-medium text-gray-900">{card.brand}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Sport</p>
                <p className="text-sm font-medium text-gray-900">{card.sport}</p>
              </div>
              {card.team && (
                <div>
                  <p className="text-xs text-gray-500">Team</p>
                  <Link
                    href={`/collection?team=${encodeURIComponent(card.team)}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {card.team}
                  </Link>
                </div>
              )}
              {card.setName && (
                <div>
                  <p className="text-xs text-gray-500">Set</p>
                  <p className="text-sm font-medium text-gray-900">{card.setName}</p>
                </div>
              )}
              {card.cardNumber && (
                <div>
                  <p className="text-xs text-gray-500">Number</p>
                  <p className="text-sm font-medium text-gray-900">{card.cardNumber}</p>
                </div>
              )}
              {card.variant && (
                <div>
                  <p className="text-xs text-gray-500">Variant</p>
                  <p className="text-sm font-medium text-gray-900">{card.variant}</p>
                </div>
              )}
              {card.condition && (
                <div>
                  <p className="text-xs text-gray-500">Condition</p>
                  <p className="text-sm font-medium text-gray-900">{card.condition}</p>
                </div>
              )}
            </div>
          </div>

          {/* Purchase & Location */}
          {(card.purchasePrice != null || card.purchaseDate || card.purchaseSource || card.location) && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Purchase & Location</h2>
              <div className="grid grid-cols-3 gap-3">
                {card.purchasePrice != null && (
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="text-sm font-medium text-gray-900">${card.purchasePrice.toFixed(2)}</p>
                  </div>
                )}
                {card.purchaseDate && (
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm font-medium text-gray-900">{card.purchaseDate}</p>
                  </div>
                )}
                {card.purchaseSource && (
                  <div>
                    <p className="text-xs text-gray-500">Source</p>
                    <p className="text-sm font-medium text-gray-900">{card.purchaseSource}</p>
                  </div>
                )}
                {card.location && (
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <Link
                      href={`/collection?location=${encodeURIComponent(card.location)}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {card.location}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {card.tags && (card.tags as string[]).length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {(card.tags as string[]).map((tag) => (
                  <Link
                    key={tag}
                    href={`/collection?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800 transition-colors hover:bg-blue-200"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {card.notes && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</h2>
              <p className="text-sm text-gray-900">{card.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
