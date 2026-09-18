import { test as base, expect, type Page } from "@playwright/test";
import { FakeSession } from "../../../testing/fakes/FakeSession";

/** Screen robot for the logged-out landing page at `/`. */
export class LandingRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("public_theme", "dark");
    });
    return this;
  }

  async open(): Promise<this> {
    // The hero's scan loop is decoration and holds on step one under reduced
    // motion. Emulating it here is what makes the page deterministic enough to
    // have a baseline — `test.use({ reducedMotion })` does not reach the page.
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await FakeSession.install(this.page, { signedOut: true });
    await this.page.goto("/");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
    return this;
  }

  async openMenu(): Promise<this> {
    await this.page.getByRole("button", { name: "Toggle menu" }).click();
    return this;
  }

  async tapNavLink(label: string): Promise<this> {
    await this.page.getByRole("button", { name: label }).click();
    return this;
  }

  async tapSeeHowItWorks(): Promise<this> {
    await this.page.getByRole("button", { name: "See How It Works" }).click();
    return this;
  }

  async seesHeadline(text: string): Promise<this> {
    await expect(this.page.getByRole("heading", { level: 1 })).toContainText(text);
    return this;
  }

  async seesMenuOpen(open: boolean): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Toggle menu" })).toHaveAttribute(
      "aria-expanded",
      String(open),
    );
    return this;
  }

  async seesSection(id: string): Promise<this> {
    await expect(this.page.locator(`#${id}`)).toBeInViewport();
    return this;
  }

  async goesTo(path: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`${path}$`));
    return this;
  }

  async tapSignUp(): Promise<this> {
    await this.page.getByRole("link", { name: "Sign Up Free" }).click();
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ landing: LandingRobot }>({
  landing: async ({ page }, provide) => {
    await provide(new LandingRobot(page));
  },
});
