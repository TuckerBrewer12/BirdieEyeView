import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, it, expect } from "vitest";
import { ThemeProvider } from "@/context/ThemeProvider";
import { PublicNav } from "../components/PublicNav";

function renderNav() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <PublicNav />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("PublicNav", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("opens and closes the mobile menu", () => {
    renderNav();
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the menu when a nav link is taken", () => {
    renderNav();
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    fireEvent.click(toggle);

    // The menu's copy of the link; the desktop row renders first.
    fireEvent.click(screen.getAllByRole("button", { name: "Try It Out" }).at(-1)!);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("offers the two nav destinations the page has anchors for", () => {
    renderNav();
    expect(screen.getAllByRole("button", { name: "Overview" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Try It Out" }).length).toBeGreaterThan(0);
  });
});
