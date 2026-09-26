import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PUBLIC_THEME_PREF_KEY } from "./theme";
import { usePublicTheme } from "./usePublicTheme";

describe("usePublicTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("starts from the stored public preference", () => {
    localStorage.setItem(PUBLIC_THEME_PREF_KEY, "dark");
    expect(renderHook(() => usePublicTheme()).result.current.isDark).toBe(true);
  });

  it("saves and applies each toggle", () => {
    const { result } = renderHook(() => usePublicTheme());

    act(() => result.current.toggle());
    expect(result.current.isDark).toBe(true);
    expect(localStorage.getItem(PUBLIC_THEME_PREF_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.isDark).toBe(false);
    expect(localStorage.getItem(PUBLIC_THEME_PREF_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
