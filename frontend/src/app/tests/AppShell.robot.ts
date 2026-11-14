import { type Locator, type Page } from "@playwright/test";
import { test as base, expect } from "../../testing/playwright";
import { FakeSession } from "../../testing/fakes/FakeSession";
import { FakeBackend, type FakeBackendSeed } from "../../testing/fakes/FakeBackend";
import { storedRounds } from "../../testing/fixtures/rounds";
import { fontsLoaded } from "../../testing/fontsLoaded";

export class AppShellRobot {
  private readonly page: Page;
  backend: FakeBackend | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  private nav(): Locator {
    return this.page.getByRole("navigation", { name: "Main" });
  }

  private menu(): Locator {
    return this.page.locator("[data-slot=bottom-nav-menu]");
  }

  private moreTab(): Locator {
    return this.nav().getByRole("button", { name: "More", exact: true });
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  async open(path = "/rounds", seed: FakeBackendSeed = {}): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    this.backend = await FakeSession.install(this.page, { rounds: storedRounds, ...seed });
    await this.page.goto(path);
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.nav()).toBeVisible();
    return this;
  }

  async tapNav(label: string): Promise<this> {
    await this.nav().getByRole("link", { name: label, exact: true }).click();
    return this;
  }

  async openMore(): Promise<this> {
    await this.moreTab().click();
    await expect(this.menu()).toBeVisible();
    return this;
  }

  async tapMenuItem(label: string): Promise<this> {
    await this.menu().getByRole("link", { name: label, exact: true }).click();
    return this;
  }

  async tapOutsideMenu(): Promise<this> {
    await this.page.locator('[data-slot="sheet-overlay"]').click({ position: { x: 8, y: 8 } });
    return this;
  }

  async seesMenuCount(label: string, count: number): Promise<this> {
    await expect(this.menu().getByRole("link", { name: `${label}, ${count} new`, exact: true })).toBeVisible();
    return this;
  }

  async seesMenuGolfer(name: string): Promise<this> {
    await expect(this.menu().getByText(name, { exact: true })).toBeVisible();
    return this;
  }

  async closeMenuWithEscape(): Promise<this> {
    await this.page.keyboard.press("Escape");
    return this;
  }

  async signOut(): Promise<this> {
    const account = this.page.locator("[data-slot=side-nav]");
    if (await account.isVisible()) {
      await account.getByText(/@example\.com$/).hover();
      await account.getByRole("button", { name: "Sign out" }).click();
    } else {
      await this.openMore();
      await this.tapMenuItem("Settings");
      await this.page.locator("main").getByRole("button", { name: "Sign out" }).click();
    }
    return this;
  }

  async isAt(path: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}$`));
    return this;
  }

  async seesCurrent(label: string): Promise<this> {
    await expect(this.nav().getByRole("link", { name: label, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    return this;
  }

  async seesMoreLit(): Promise<this> {
    await expect(this.moreTab()).toHaveAttribute("data-active", "");
    return this;
  }

  async seesMenuClosed(): Promise<this> {
    await expect(this.menu()).toBeHidden();
    return this;
  }

  async seesSignedOut(): Promise<this> {
    await expect(this.page).toHaveURL(/\/$/);
    await expect(this.nav()).toHaveCount(0);
    expect(this.backend?.signedOut).toBe(true);
    return this;
  }

  async capture(name: string): Promise<this> {
    await fontsLoaded(this.page);
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ shell: AppShellRobot }>({
  shell: async ({ page }, provide) => {
    await provide(new AppShellRobot(page));
  },
});
