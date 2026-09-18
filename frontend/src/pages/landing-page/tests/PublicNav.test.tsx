import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { PUBLIC_THEME_PREF_KEY } from "@/lib/theme";
import { PublicNav } from "../components/PublicNav";

function renderNav() {
  return render(
    <MemoryRouter>
      <PublicNav />
    </MemoryRouter>,
  );
}

describe("PublicNav", () => {
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

    fireEvent.click(screen.getAllByRole("button", { name: "Try It Out" })[0]);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("offers the two nav destinations the page has anchors for", () => {
    renderNav();
    expect(screen.getAllByRole("button", { name: "Overview" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Try It Out" }).length).toBeGreaterThan(0);
  });

  it("flips the theme, its label, and the stored preference together", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: "Switch to Dark Mode" }));

    expect(screen.getByRole("button", { name: "Switch to Light Mode" })).toBeInTheDocument();
    expect(localStorage.getItem(PUBLIC_THEME_PREF_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Switch to Light Mode" }));

    expect(localStorage.getItem(PUBLIC_THEME_PREF_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
