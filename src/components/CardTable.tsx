import Link from "next/link";
import type { Card, CardPlayer } from "@/db/schema";

interface CardTableProps {
  cards: Card[];
}

export function CardTable({ cards }: CardTableProps) {
  if (cards.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No cards found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Player</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Year</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Brand</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Team</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {cards.map((card) => {
            const players = (card.players as CardPlayer[]) ?? [];
            const playerNames = players.map((p) => p.name).join(" / ");
            const teams = [...new Set(players.map((p) => p.team).filter(Boolean))].join(" / ");
            return (
              <tr key={card.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/collection/${card.id}`} className="font-medium text-blue-600 hover:underline">
                    {playerNames}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{card.year}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{card.brand}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{teams}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {card.purchasePrice != null ? `$${card.purchasePrice.toFixed(2)}` : "--"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
