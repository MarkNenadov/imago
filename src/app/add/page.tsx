"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CardForm, type CardFormData } from "@/components/CardForm";

export default function AddCardPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CardFormData) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Failed to save card");
      }

      const card = await response.json();
      router.push(`/collection/${card.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Card</h1>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <CardForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
