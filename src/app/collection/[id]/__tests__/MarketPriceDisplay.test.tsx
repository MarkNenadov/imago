import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MarketPriceDisplay } from "../MarketPriceDisplay";

describe("MarketPriceDisplay", () => {
  it("renders a Check button when idle", () => {
    render(<MarketPriceDisplay state={{ status: "idle" }} onFetch={() => {}} />);
    expect(screen.getByRole("button", { name: "Check" })).toBeInTheDocument();
  });

  it("renders a disabled Loading button when loading", () => {
    render(<MarketPriceDisplay state={{ status: "loading" }} onFetch={() => {}} />);
    const button = screen.getByRole("button", { name: "Loading…" });
    expect(button).toBeDisabled();
  });

  it("renders the price when found", () => {
    render(<MarketPriceDisplay state={{ status: "found", price: 12.5 }} onFetch={() => {}} />);
    expect(screen.getByText("$12.50")).toBeInTheDocument();
  });

  it("shows no profit/loss when purchasePrice is not provided", () => {
    render(<MarketPriceDisplay state={{ status: "found", price: 12.5 }} onFetch={() => {}} />);
    expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
  });

  it("shows a green gain when market price exceeds purchase price", () => {
    render(
      <MarketPriceDisplay
        state={{ status: "found", price: 15 }}
        purchasePrice={10}
        onFetch={() => {}}
      />,
    );
    const pl = screen.getByText("+$5.00 ↑");
    expect(pl).toHaveClass("text-green-600");
  });

  it("shows a red loss when market price is below purchase price", () => {
    render(
      <MarketPriceDisplay
        state={{ status: "found", price: 7 }}
        purchasePrice={10}
        onFetch={() => {}}
      />,
    );
    const pl = screen.getByText("−$3.00 ↓");
    expect(pl).toHaveClass("text-red-600");
  });

  it("shows a green zero gain when market price equals purchase price", () => {
    render(
      <MarketPriceDisplay
        state={{ status: "found", price: 10 }}
        purchasePrice={10}
        onFetch={() => {}}
      />,
    );
    const pl = screen.getByText("+$0.00 ↑");
    expect(pl).toHaveClass("text-green-600");
  });

  it("renders Not found when not-found", () => {
    render(<MarketPriceDisplay state={{ status: "not-found" }} onFetch={() => {}} />);
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("renders Lookup failed when error", () => {
    render(<MarketPriceDisplay state={{ status: "error" }} onFetch={() => {}} />);
    expect(screen.getByText("Lookup failed")).toBeInTheDocument();
  });

  it("calls onFetch when Check button is clicked", async () => {
    const onFetch = vi.fn();
    render(<MarketPriceDisplay state={{ status: "idle" }} onFetch={onFetch} />);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onFetch).toHaveBeenCalledOnce();
  });
});
