import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./Collapsible";

function renderMenu() {
  render(
    <Collapsible>
      <CollapsibleTrigger>Menu</CollapsibleTrigger>
      <CollapsibleContent>Links</CollapsibleContent>
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
});
