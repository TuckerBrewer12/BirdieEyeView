import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PUBLIC_THEME_PREF_KEY } from "@/lib/theme";
import { useLandingPageViewModel } from "../useLandingPageViewModel";

describe("useLandingPageViewModel", () => {
  it("opens and closes the mobile menu", () => {
    const { result } = renderHook(() => useLandingPageViewModel());
    expect(result.current.navOpen).toBe(false);

    act(() => result.current.toggleNav());
    expect(result.current.navOpen).toBe(true);

    act(() => result.current.toggleNav());
    expect(result.current.navOpen).toBe(false);
  });

  it("closes the menu when a nav link is taken", () => {
    const { result } = renderHook(() => useLandingPageViewModel());
    act(() => result.current.toggleNav());

    act(() => result.current.navLinks[1].select());

    // Desktop and mobile call the same handler, so the menu cannot be left
    // open behind the section the visitor just jumped to.
    expect(result.current.navOpen).toBe(false);
  });

  it("offers the two nav destinations the page has anchors for", () => {
    const { result } = renderHook(() => useLandingPageViewModel());
    expect(result.current.navLinks.map((link) => link.label)).toEqual(["Overview", "Try It Out"]);
  });

  it("flips the theme, its label, and the stored preference together", () => {
    const { result } = renderHook(() => useLandingPageViewModel());
    expect(result.current.isDark).toBe(false);
    expect(result.current.themeToggleLabel).toBe("Dark Mode");

    act(() => result.current.toggleTheme());

    expect(result.current.isDark).toBe(true);
    expect(result.current.themeToggleLabel).toBe("Light Mode");
    expect(localStorage.getItem(PUBLIC_THEME_PREF_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => result.current.toggleTheme());

    expect(result.current.isDark).toBe(false);
    expect(localStorage.getItem(PUBLIC_THEME_PREF_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
