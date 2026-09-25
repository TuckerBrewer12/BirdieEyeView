import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  Collapsible,
  CollapsibleClose,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./Collapsible";

function renderMenu(onPick = vi.fn()) {
  render(
    <Collapsible>
      <CollapsibleTrigger>Menu</CollapsibleTrigger>
      <CollapsibleContent>
        <CollapsibleClose onClick={onPick}>Pick</CollapsibleClose>
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
    const onPick = vi.fn();
    const trigger = renderMenu(onPick);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Pick" }));
    expect(onPick).toHaveBeenCalledOnce();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
