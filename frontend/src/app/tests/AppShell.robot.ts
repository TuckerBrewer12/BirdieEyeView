import { type Locator, type Page } from "@playwright/test";
import { test as base, expect } from "../../testing/playwright";
import { FakeSession } from "../../testing/fakes/FakeSession";
import { FakeBackend, type FakeBackendSeed } from "../../testing/fakes/FakeBackend";
import { storedRounds } from "../../testing/fixtures/rounds";

/** Screen robot for the signed-in shell: the side rail, the tab bar and its More menu. */
export class AppShellRobot {
  private readonly page: Page;
  backend: FakeBackend | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /** Whichever nav the viewport shows; the other is display:none and out of the tree. */
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

  /** A link in the side rail on a wide screen, or a tab on a phone. */
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

  /** Taps the dimmed page above the More sheet: the backdrop's top corner, which a bottom sheet never covers. */
  async tapOutsideMenu(): Promise<this> {
    await this.page.locator('[data-slot="sheet-overlay"]').click({ position: { x: 8, y: 8 } });
    return this;
  }

  /** A More sheet row's count of what waits there, read as "Social, 1 new". */
  async seesMenuCount(label: string, count: number): Promise<this> {
    await expect(this.menu().getByRole("link", { name: `${label}, ${count} new`, exact: true })).toBeVisible();
    return this;
  }

  /** The golfer at the top of the More sheet. */
  async seesMenuGolfer(name: string): Promise<this> {
    await expect(this.menu().getByText(name, { exact: true })).toBeVisible();
    return this;
  }

  async closeMenuWithEscape(): Promise<this> {
    await this.page.keyboard.press("Escape");
    return this;
  }

  /** The sign-out on the rail's account row shows on hover; on a phone it is in Settings, through More. */
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
    // Signed out, the app falls back to the landing page at /.
    await expect(this.page).toHaveURL(/\/$/);
    await expect(this.nav()).toHaveCount(0);
    expect(this.backend?.signedOut).toBe(true);
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ shell: AppShellRobot }>({
  shell: async ({ page }, provide) => {
    await provide(new AppShellRobot(page));
  },
});
