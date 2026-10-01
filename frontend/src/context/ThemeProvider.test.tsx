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

const isDark = () => document.documentElement.classList.contains("dark");

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
    expect(isDark()).toBe(true);

    act(() => device.setDark(false));
    expect(result.current.resolved).toBe("light");
    expect(isDark()).toBe(false);
  });

  it("saves an explicit choice and stops following the device", () => {
    onDevice(false);
    const { result } = renderTheme();

    act(() => result.current.toggle());
    expect(result.current.preference).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(isDark()).toBe(true);

    act(() => device.setDark(false));
    expect(isDark()).toBe(true);
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
