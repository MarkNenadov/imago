import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardForm } from "@/components/CardForm";

describe("CardForm", () => {
  it("should render primary fields", () => {
    render(<CardForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/player name \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/year/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/brand/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
  });

  it("should show collapsed fields after clicking More Details", async () => {
    const user = userEvent.setup();
    render(<CardForm onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/^set$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /more details/i }));

    expect(screen.getByLabelText(/^set$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it("should call onSubmit with form data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CardForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/player name \(optional\)/i), "Mike Trout");
    await user.type(screen.getByLabelText(/year/i), "2023");
    await user.type(screen.getByLabelText(/brand/i), "Topps");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        players: [{ name: "Mike Trout" }],
        year: 2023,
        brand: "Topps",
      }),
    );
  });

  it("should submit as team card when player name is empty but team is selected", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CardForm onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByRole("combobox", { name: /team/i }), "New York Yankees");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        players: [{ name: "", team: "New York Yankees" }],
      }),
    );
  });

  it("should submit with empty players when no name or team is provided", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CardForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ players: [] }),
    );
  });

  it("should accept initial values for pre-filling", () => {
    render(
      <CardForm
        onSubmit={vi.fn()}
        initialValues={{ players: [{ name: "Ohtani" }], year: 2024, brand: "Topps" }}
      />,
    );

    expect(screen.getByLabelText(/player name \(optional\)/i)).toHaveValue("Ohtani");
    expect(screen.getByLabelText(/year/i)).toHaveValue(2024);
  });
});
