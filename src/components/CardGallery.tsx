import Link from "next/link";
import type { Card } from "@/db/schema";

interface CardGalleryProps {
  cards: Card[];
}

export function CardGallery({ cards }: CardGalleryProps) {
  if (cards.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No cards found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => (
        <Link
          key={card.id}
          href={`/collection/${card.id}`}
          className="group rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition hover:shadow-md"
        >
          <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded bg-gray-100">
            {card.imageFront ? (
              <img
                src={card.imageFront}
                alt={`${card.playerName} ${card.year} ${card.brand} ${card.setName}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                No image
              </div>
            )}
          </div>
          <div className="mt-2">
            <p className="truncate text-sm font-medium text-gray-900">{card.playerName}</p>
            <p className="truncate text-xs text-gray-500">
              {[card.year, card.brand, card.setName].filter(Boolean).join(" ")}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
