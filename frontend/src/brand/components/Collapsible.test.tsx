import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Collapsible,
  CollapsibleClose,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./Collapsible";

class FakeClick {
  readonly clicks: unknown[] = [];

  record(event: unknown) {
    this.clicks.push(event);
  }
}

function renderMenu(onPick = new FakeClick()) {
  render(
    <Collapsible>
      <CollapsibleTrigger>Menu</CollapsibleTrigger>
      <CollapsibleContent>
        <CollapsibleClose onClick={(event) => onPick.record(event)}>Pick</CollapsibleClose>
      </CollapsibleContent>
    </Collapsible>,
  );
  return screen.getByRole("button", { name: "Menu" });
}

describe("Collapsible", () => {
  it("toggles from the trigger", () => {
    const trigger = renderMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("runs the close part's own click, then folds", () => {
    const onPick = new FakeClick();
    const trigger = renderMenu(onPick);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Pick" }));
    expect(onPick.clicks).toHaveLength(1);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
