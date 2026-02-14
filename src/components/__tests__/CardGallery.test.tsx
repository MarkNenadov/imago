import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardGallery } from "@/components/CardGallery";
import type { Card } from "@/db/schema";

const mockCards: Partial<Card>[] = [
  {
    id: "1",
    playerName: "Mike Trout",
    year: 2023,
    brand: "Topps",
    setName: "Chrome",
    imageFront: "/uploads/trout.jpg",
    sport: "baseball",
  },
  {
    id: "2",
    playerName: "Shohei Ohtani",
    year: 2023,
    brand: "Topps",
    setName: "Chrome",
    imageFront: null,
    sport: "baseball",
  },
];

describe("CardGallery", () => {
  it("should render a card for each entry", () => {
    render(<CardGallery cards={mockCards as Card[]} />);

    expect(screen.getByText("Mike Trout")).toBeInTheDocument();
    expect(screen.getByText("Shohei Ohtani")).toBeInTheDocument();
  });

  it("should show placeholder when no image", () => {
    render(<CardGallery cards={mockCards as Card[]} />);

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(1);
  });

  it("should show empty state when no cards", () => {
    render(<CardGallery cards={[]} />);

    expect(screen.getByText(/no cards found/i)).toBeInTheDocument();
  });
});
