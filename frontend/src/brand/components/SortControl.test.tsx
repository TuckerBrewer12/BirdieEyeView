import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { SortControl } from "./SortControl";

const OPTIONS = [
  { value: "date", label: "Date" },
  { value: "score", label: "Score" },
] as const;

function renderSort(disabled: boolean) {
  const change = new FakeHandler();
  render(
    <SortControl label="Date" value="date" options={OPTIONS} onChange={change.handle} disabled={disabled} />,
  );
  return screen.getAllByRole("button", { name: "Sort by" });
}

describe("SortControl", () => {
  it("disables the menu and the phone sheet's trigger", () => {
    const triggers = renderSort(true);
    expect(triggers).toHaveLength(2);
    for (const trigger of triggers) expect(trigger).toBeDisabled();
  });

  it("leaves both triggers enabled by default", () => {
    for (const trigger of renderSort(false)) expect(trigger).toBeEnabled();
  });
});
