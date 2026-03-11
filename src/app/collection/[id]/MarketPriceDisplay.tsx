export type MarketPriceState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; price: number }
  | { status: "not-found" }
  | { status: "error" };

function ProfitLoss({ marketPrice, purchasePrice }: { marketPrice: number; purchasePrice: number }) {
  const diff = marketPrice - purchasePrice;
  const isGain = diff >= 0;
  const sign = isGain ? "+" : "−";
  const arrow = isGain ? "↑" : "↓";
  const colorClass = isGain ? "text-green-600" : "text-red-600";

  return (
    <p className={`text-xs font-medium ${colorClass}`}>
      {sign}${Math.abs(diff).toFixed(2)} {arrow}
    </p>
  );
}

export function MarketPriceDisplay({
  state,
  purchasePrice,
  onFetch,
}: {
  state: MarketPriceState;
  purchasePrice?: number;
  onFetch: () => void;
}) {
  if (state.status === "found") {
    return (
      <div>
        <p className="text-sm font-medium text-gray-900">${state.price.toFixed(2)}</p>
        {purchasePrice != null && (
          <ProfitLoss marketPrice={state.price} purchasePrice={purchasePrice} />
        )}
      </div>
    );
  }
  if (state.status === "not-found") {
    return <p className="text-sm text-gray-400">Not found</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-500">Lookup failed</p>;
  }
  return (
    <button
      type="button"
      onClick={onFetch}
      disabled={state.status === "loading"}
      className="text-sm font-medium text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
    >
      {state.status === "loading" ? "Loading…" : "Check"}
    </button>
  );
}
