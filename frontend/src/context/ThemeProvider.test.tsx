import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, useTheme } from "./theme";
import { ThemeProvider } from "./ThemeProvider";

/** A device dark-mode setting the test can flip, like the OS toggling. */
function fakeDevice(dark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    matches: dark,
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => query);
  return {
    setDark(next: boolean) {
      query.matches = next;
      listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
    },
  };
}

function renderTheme() {
  const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;
  return renderHook(() => useTheme(), { wrapper });
}

const isDark = () => document.documentElement.classList.contains("dark");

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("follows the device until the player chooses", () => {
    const device = fakeDevice(true);
    const { result } = renderTheme();
    expect(result.current.preference).toBe("system");
    expect(result.current.resolved).toBe("dark");
    expect(isDark()).toBe(true);

    act(() => device.setDark(false));
    expect(result.current.resolved).toBe("light");
    expect(isDark()).toBe(false);
  });

  it("saves an explicit choice and stops following the device", () => {
    const device = fakeDevice(false);
    const { result } = renderTheme();

    act(() => result.current.toggle());
    expect(result.current.preference).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(isDark()).toBe(true);

    act(() => device.setDark(false));
    expect(isDark()).toBe(true);
  });

  it("keeps a choice saved under the old signed-in or signed-out keys", () => {
    fakeDevice(false);
    localStorage.setItem("settings_theme", "dark");
    const { result } = renderTheme();
    expect(result.current.preference).toBe("dark");

    act(() => result.current.setPreference("system"));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    expect(localStorage.getItem("settings_theme")).toBeNull();
  });
});
