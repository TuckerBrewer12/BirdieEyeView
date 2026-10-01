import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import { expectTheme } from "../../../testing/theme";

type ThemeLabel = "Light" | "Dark" | "System";

/** Screen robot for /settings. */
export class SettingsRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private themeControl() {
    return this.page.getByRole("group", { name: "Theme" });
  }

  private themeOption(label: ThemeLabel) {
    return this.themeControl().getByRole("button", { name: label, exact: true });
  }

  /** Starts the player on Dark; init scripts rerun on reload, so a later pick is left alone. */
  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      if (localStorage.getItem("theme") === null) localStorage.setItem("theme", "dark");
    });
    return this;
  }

  async open(): Promise<this> {
    await FakeSession.install(this.page, {});
    await this.page.goto("/settings");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.themeControl()).toBeVisible();
    return this;
  }

  async reload(): Promise<this> {
    await this.page.reload();
    await expect(this.themeControl()).toBeVisible();
    return this;
  }

  async pickTheme(label: ThemeLabel): Promise<this> {
    await this.themeOption(label).click();
    return this;
  }

  async seesThemePicked(label: ThemeLabel): Promise<this> {
    await expect(this.themeOption(label)).toHaveAttribute("aria-pressed", "true");
    return this;
  }

  async seesTheme(theme: "light" | "dark"): Promise<this> {
    await expectTheme(this.page, theme);
    return this;
  }

  async leaveTo(label: string): Promise<this> {
    await this.page.getByRole("link", { name: label, exact: true }).click();
    return this;
  }

  /** Leaving did not stop on the unsaved-changes prompt. */
  async isAt(path: string): Promise<this> {
    await expect(this.page.getByRole("heading", { name: "Unsaved changes detected" })).toHaveCount(0);
    await expect.poll(() => new URL(this.page.url()).pathname).toBe(path);
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.themeControl()).toHaveScreenshot(name);
    return this;
  }
}

export const test = base.extend<{ settings: SettingsRobot }>({
  settings: async ({ page }, provide) => {
    await provide(new SettingsRobot(page));
  },
});
