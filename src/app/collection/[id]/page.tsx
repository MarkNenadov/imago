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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-4">
          {card.imageFront ? (
            <img
              src={card.imageFront}
              alt={`${card.playerName} front`}
              className="w-full rounded-lg"
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
              className="w-full rounded-lg"
            />
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-medium text-gray-500">Card Details</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-sm text-gray-500">Year</dt>
              <dd className="text-sm text-gray-900">{card.year ?? "--"}</dd>
              <dt className="text-sm text-gray-500">Brand</dt>
              <dd className="text-sm text-gray-900">{card.brand ?? "--"}</dd>
              <dt className="text-sm text-gray-500">Set</dt>
              <dd className="text-sm text-gray-900">{card.setName ?? "--"}</dd>
              <dt className="text-sm text-gray-500">Number</dt>
              <dd className="text-sm text-gray-900">{card.cardNumber ?? "--"}</dd>
              <dt className="text-sm text-gray-500">Team</dt>
              <dd className="text-sm text-gray-900">{card.team ?? "--"}</dd>
              <dt className="text-sm text-gray-500">Sport</dt>
              <dd className="text-sm text-gray-900">{card.sport}</dd>
              <dt className="text-sm text-gray-500">Variant</dt>
              <dd className="text-sm text-gray-900">{card.variant ?? "--"}</dd>
            </dl>
          </section>

          <section>
            <h2 className="text-sm font-medium text-gray-500">Condition</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-sm text-gray-500">Condition</dt>
              <dd className="text-sm text-gray-900">{card.condition ?? "--"}</dd>
            </dl>
          </section>

          <section>
            <h2 className="text-sm font-medium text-gray-500">Purchase & Location</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-sm text-gray-500">Price</dt>
              <dd className="text-sm text-gray-900">
                {card.purchasePrice != null ? `$${card.purchasePrice.toFixed(2)}` : "--"}
              </dd>
              <dt className="text-sm text-gray-500">Date</dt>
              <dd className="text-sm text-gray-900">{card.purchaseDate ?? "--"}</dd>
              <dt className="text-sm text-gray-500">Source</dt>
              <dd className="text-sm text-gray-900">{card.purchaseSource ?? "--"}</dd>
              <dt className="text-sm text-gray-500">Location</dt>
              <dd className="text-sm text-gray-900">{card.location ?? "--"}</dd>
            </dl>
          </section>

          {card.tags && (card.tags as string[]).length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-gray-500">Tags</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {(card.tags as string[]).map((tag) => (
                  <Link
                    key={tag}
                    href={`/collection?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 hover:bg-blue-200 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {card.notes && (
            <section>
              <h2 className="text-sm font-medium text-gray-500">Notes</h2>
              <p className="mt-2 text-sm text-gray-900">{card.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
