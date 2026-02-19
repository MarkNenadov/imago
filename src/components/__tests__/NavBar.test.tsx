import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavBar } from "@/components/NavBar";

describe("NavBar", () => {
  it("should render navigation links", () => {
    render(<NavBar />);

    expect(screen.getByRole("link", { name: /imago/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /collection/i })).toHaveAttribute("href", "/collection");
    expect(screen.getByRole("link", { name: /statistics/i })).toHaveAttribute("href", "/statistics");
    expect(screen.getByRole("link", { name: /tools/i })).toHaveAttribute("href", "/tools");
    expect(screen.getByRole("button", { name: /add card/i })).toBeInTheDocument();
  });

  it("should render the app name", () => {
    render(<NavBar />);
    expect(screen.getByText("Imago")).toBeInTheDocument();
  });
});
