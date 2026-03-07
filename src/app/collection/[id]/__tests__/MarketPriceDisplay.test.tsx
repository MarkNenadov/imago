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
