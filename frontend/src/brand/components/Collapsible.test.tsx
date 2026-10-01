import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import {
  Collapsible,
  CollapsibleClose,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./Collapsible";

function renderMenu(pick = new FakeHandler()) {
  render(
    <Collapsible>
      <CollapsibleTrigger>Menu</CollapsibleTrigger>
      <CollapsibleContent>
        <CollapsibleClose onClick={pick.handle}>Pick</CollapsibleClose>
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
    const pick = new FakeHandler();
    const trigger = renderMenu(pick);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Pick" }));
    expect(pick.calls).toHaveLength(1);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
