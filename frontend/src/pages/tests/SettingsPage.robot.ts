import { type Locator, type Page } from "@playwright/test";
import { test as base, expect } from "../../testing/playwright";
import { FakeSession } from "../../testing/fakes/FakeSession";
import type { User } from "../../types/golf";

const settingsUser: User = {
  id: "user-1",
  name: "Test Golfer",
  email: "test@example.com",
  friend_code: "BIRD-1",
  home_course_id: null,
  handicap: null,
  created_at: null,
  scoring_goal: null,
};

/** Screen robot for /settings — same idea as an Android Espresso robot. */
export class SettingsRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private themeButton(label: string): Locator {
    return this.page.getByRole("button", { name: label, exact: true });
  }

  /** The Light / Dark / System segment. */
  private themeControl(): Locator {
    return this.themeButton("Light").locator("..");
  }

  async open(): Promise<this> {
    await FakeSession.install(this.page, { profile: settingsUser });
    await this.page.goto("/settings");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByRole("heading", { name: "Preferences" })).toBeVisible();
    await expect(this.themeButton("System")).toBeVisible();
    return this;
  }

  async pickTheme(label: string): Promise<this> {
    await this.themeButton(label).click();
    return this;
  }

  async seesThemeSelected(label: string): Promise<this> {
    await expect(this.themeButton(label)).toHaveClass(/font-semibold/);
    return this;
  }

  async seesStoredTheme(value: string): Promise<this> {
    await expect.poll(() => this.page.evaluate(() => localStorage.getItem("theme"))).toBe(value);
    return this;
  }

  async doesNotSeeSaved(): Promise<this> {
    await expect(this.page.getByText("Settings saved.")).toHaveCount(0);
    return this;
  }

  async leaveTo(label: string): Promise<this> {
    await this.page.getByRole("link", { name: label, exact: true }).click();
    return this;
  }

  async doesNotSeeUnsavedChanges(): Promise<this> {
    await expect(this.page.getByRole("heading", { name: "Unsaved changes detected" })).toHaveCount(0);
    return this;
  }

  async isAt(path: string): Promise<this> {
    await expect(this.page).toHaveURL(path === "/" ? /\/$/ : new RegExp(`${path}$`));
    return this;
  }

  async returnToSettings(): Promise<this> {
    await this.page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(this.page.getByRole("heading", { name: "Preferences" })).toBeVisible();
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
