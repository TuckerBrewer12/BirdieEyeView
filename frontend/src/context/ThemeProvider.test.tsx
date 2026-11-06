import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FakeColorScheme } from "@/testing/fakes/FakeColorScheme";
import { THEME_STORAGE_KEY, useTheme } from "./theme";
import { ThemeProvider } from "./ThemeProvider";

function renderTheme() {
  const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;
  return renderHook(() => useTheme(), { wrapper });
}

/** Every token flips on `dark`, so the class on <html> is the theme the page is drawn in. */
function expectTheme(theme: "light" | "dark") {
  if (theme === "dark") expect(document.documentElement).toHaveClass("dark");
  else expect(document.documentElement).not.toHaveClass("dark");
}

describe("ThemeProvider", () => {
  let device: FakeColorScheme;

  function onDevice(dark: boolean) {
    device = new FakeColorScheme({ dark }).install();
    return device;
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });
  afterEach(() => device?.restore());

  it("follows the device until the player chooses", () => {
    onDevice(true);
    const { result } = renderTheme();
    expect(result.current.preference).toBe("system");
    expect(result.current.resolved).toBe("dark");
    expectTheme("dark");

    act(() => device.setDark(false));
    expect(result.current.resolved).toBe("light");
    expectTheme("light");
  });

  it("saves an explicit choice and stops following the device", () => {
    onDevice(false);
    const { result } = renderTheme();

    act(() => result.current.toggle());
    expect(result.current.preference).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expectTheme("dark");

    act(() => device.setDark(false));
    expectTheme("dark");
  });

  it("keeps a choice saved under the old signed-in or signed-out keys", () => {
    onDevice(false);
    localStorage.setItem("settings_theme", "dark");
    const { result } = renderTheme();
    expect(result.current.preference).toBe("dark");

    act(() => result.current.setPreference("system"));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    expect(localStorage.getItem("settings_theme")).toBeNull();
  });
});
