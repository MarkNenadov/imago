import type { WishlistItem } from "@/db/schema";

interface Props {
  items: WishlistItem[];
  onDelete: (id: string) => void;
}

export function WishlistTable({ items, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Your wishlist is empty. Add a card below or use Fill Gaps.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="pb-2 pr-4 font-medium">Player</th>
            <th className="pb-2 pr-4 font-medium">Year</th>
            <th className="pb-2 pr-4 font-medium">Brand</th>
            <th className="pb-2 pr-4 font-medium">Set</th>
            <th className="pb-2 pr-4 font-medium">#</th>
            <th className="pb-2 pr-4 font-medium">Variant</th>
            <th className="pb-2 pr-4 font-medium">Raw $</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium">{item.playerName}</td>
              <td className="py-2 pr-4 text-gray-600">{item.year ?? "—"}</td>
              <td className="py-2 pr-4 text-gray-600">{item.brand ?? "—"}</td>
              <td className="py-2 pr-4 text-gray-600">{item.setName ?? "—"}</td>
              <td className="py-2 pr-4 text-gray-600">{item.cardNumber ?? "—"}</td>
              <td className="py-2 pr-4 text-gray-600">{item.variant ?? "—"}</td>
              <td className="py-2 pr-4 text-gray-600">
                {item.rawPrice != null ? `$${item.rawPrice.toFixed(2)}` : "—"}
              </td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                  aria-label={`Remove ${item.playerName} from wishlist`}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
