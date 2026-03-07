export type MarketPriceState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; price: number }
  | { status: "not-found" }
  | { status: "error" };

export function MarketPriceDisplay({
  state,
  onFetch,
}: {
  state: MarketPriceState;
  onFetch: () => void;
}) {
  if (state.status === "found") {
    return <p className="text-sm font-medium text-gray-900">${state.price.toFixed(2)}</p>;
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
