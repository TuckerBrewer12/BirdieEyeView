import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { TeePicker } from "./TeePicker";

const TEES = [
  { name: "Blue", yards: 6697 },
  { name: "White", yards: 6214 },
];

describe("TeePicker", () => {
  it("presses the tee played, whatever its case", () => {
    render(<TeePicker tees={TEES} value="blue" onChange={new FakeHandler().handle} />);
    expect(screen.getByRole("button", { name: /^Blue/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^White/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("moves between tees with the arrow keys and picks one", async () => {
    const change = new FakeHandler<[string]>();
    render(<TeePicker tees={TEES} value="Blue" onChange={change.handle} />);
    const blue = screen.getByRole("button", { name: /^Blue/ });
    blue.focus();
    fireEvent.keyDown(blue, { key: "ArrowRight" });
    const white = screen.getByRole("button", { name: /^White/ });
    await waitFor(() => expect(white).toHaveFocus());
    fireEvent.click(white);
    expect(change.calls).toEqual([["White"]]);
  });

  it("keeps the tee when its chip is pressed again", () => {
    const change = new FakeHandler<[string]>();
    render(<TeePicker tees={TEES} value="Blue" onChange={change.handle} />);
    fireEvent.click(screen.getByRole("button", { name: /^Blue/ }));
    expect(change.calls).toEqual([]);
  });

  it("clears the tee when the caller lets it and its chip is pressed again", () => {
    const cleared = new FakeHandler();
    render(<TeePicker tees={TEES} value="Blue" onChange={new FakeHandler().handle} onClear={cleared.handle} />);
    fireEvent.click(screen.getByRole("button", { name: /^Blue/ }));
    expect(cleared.calls).toHaveLength(1);
  });

  it("shows a tee's detail after its yardage", () => {
    render(
      <TeePicker tees={[{ name: "Blue", yards: 6697, detail: "72.4 / 130 · CH 12" }]} value="Blue" onChange={new FakeHandler().handle} />,
    );
    expect(screen.getByRole("button", { name: /^Blue/ })).toHaveTextContent("Blue6,69772.4 / 130 · CH 12");
  });
});
