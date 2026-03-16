"use client";

import { useState } from "react";
import type { Card, CardPlayer } from "@/db/schema";
import { buildPostText } from "@/lib/bluesky";

type PostState =
  | { status: "idle" }
  | { status: "posting" }
  | { status: "success" }
  | { status: "error"; message: string };

const MAX_CHARS = 300;

interface ShareToBlueskyModalProps {
  card: Card;
  rotation: number;
  onClose: () => void;
}

export function ShareToBlueskyModal({ card, rotation, onClose }: ShareToBlueskyModalProps) {
  const [text, setText] = useState(() => buildPostText(card));
  const [postState, setPostState] = useState<PostState>({ status: "idle" });

  const isOverLimit = text.length > MAX_CHARS;
  const isPosting = postState.status === "posting";

  async function handlePost() {
    setPostState({ status: "posting" });
    try {
      const res = await fetch("/api/bluesky/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, text, rotation }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setPostState({ status: "error", message: body.error ?? "Post failed" });
        return;
      }
      setPostState({ status: "success" });
    } catch {
      setPostState({ status: "error", message: "Network error" });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Share to Bluesky</h2>

        {postState.status === "success" ? (
          <div className="space-y-4">
            <p className="text-sm text-green-700">Posted successfully!</p>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {card.imageFront && (
              <img
                src={card.imageFront}
                alt={`${(card.players as CardPlayer[])[0]?.name ?? "Card"} front`}
                className="mb-4 h-32 rounded object-contain"
                style={rotation !== 0 ? { transform: `rotate(${rotation}deg)` } : undefined}
              />
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-gray-300 p-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div
              className={`mt-1 text-right text-xs ${isOverLimit ? "text-red-600" : "text-gray-400"}`}
            >
              {text.length}/{MAX_CHARS}
            </div>
            {postState.status === "error" && (
              <p className="mt-2 text-sm text-red-600">{postState.message}</p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isPosting}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePost}
                disabled={isPosting || isOverLimit}
                className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
              >
                {isPosting ? "Posting…" : "Post"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
