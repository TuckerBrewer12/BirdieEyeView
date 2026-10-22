import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
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
  it("opens and closes the mobile menu", () => {
    renderNav();
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
