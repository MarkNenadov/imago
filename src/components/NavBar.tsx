"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AddCardModal } from "./AddCardModal";

const NAV_LINKS = [
  { href: "/collection", label: "Collection" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/statistics", label: "Stats" },
  { href: "/tools", label: "Tools" },
] as const;

export function NavBar() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [callsRemaining, setCallsRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/cardsight/subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { callsRemaining: number } | null) => {
        if (data?.callsRemaining != null) {
          setCallsRemaining(data.callsRemaining);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Imago
            </Link>

            {/* Desktop nav */}
            <div className="hidden items-center gap-6 sm:flex">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {label}
                </Link>
              ))}
              {callsRemaining !== null && (
                <span
                  className={`text-xs ${callsRemaining <= 20 ? "text-amber-500" : "text-gray-400"}`}
                >
                  {callsRemaining} calls left
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white hover:bg-blue-700"
                aria-label="Add Card"
              >
                +
              </button>
            </div>

            {/* Mobile right side */}
            <div className="flex items-center gap-3 sm:hidden">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white hover:bg-blue-700"
                aria-label="Add Card"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-8 w-8 items-center justify-center rounded text-gray-700 hover:text-gray-900"
                aria-label="Toggle menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {menuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pb-3 sm:hidden">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-base font-medium text-gray-700 hover:text-gray-900"
              >
                {label}
              </Link>
            ))}
            {callsRemaining !== null && (
              <p
                className={`pt-1 text-xs ${callsRemaining <= 20 ? "text-amber-500" : "text-gray-400"}`}
              >
                {callsRemaining} calls left
              </p>
            )}
          </div>
        )}
      </nav>

      {showAddModal && <AddCardModal onClose={() => setShowAddModal(false)} />}
    </>
  );
}
