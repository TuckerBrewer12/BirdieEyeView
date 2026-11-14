import { type Page } from "@playwright/test";
import { expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { fontsLoaded } from "../../../testing/fontsLoaded";

export type AuthSeed = Omit<FakeBackendSeed, "signedOut">;

export class AuthScreenRobot {
  protected readonly page: Page;
  backend: FakeBackend | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  protected async visit(path: string, heading: string, seed: AuthSeed = {}): Promise<void> {
    this.backend = await FakeSession.install(this.page, { ...seed, signedOut: true });
    await this.page.goto(path);
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await this.seesHeading(heading);
  }

  protected async visitWithState(
    path: string,
    heading: string,
    state: Record<string, unknown>,
    seed: AuthSeed = {},
  ): Promise<void> {
    this.backend = await FakeSession.install(this.page, { ...seed, signedOut: true });
    await this.page.goto("/");
    await this.page.evaluate(
      ({ to, routeState }) => {
        window.history.pushState({ usr: routeState, key: "robot", idx: 1 }, "", to);
        window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
      },
      { to: path, routeState: state },
    );
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await this.seesHeading(heading);
  }

  protected async fill(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label, { exact: true }).fill(value);
  }

  protected async tap(name: string): Promise<void> {
    await this.page.getByRole("button", { name, exact: true }).click();
  }

  async seesHeading(heading: string): Promise<this> {
    await expect(this.page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    return this;
  }

  async seesNotice(text: string): Promise<this> {
    await expect(this.page.getByRole("status").filter({ hasText: text })).toBeVisible();
    return this;
  }

  async seesError(text: string): Promise<this> {
    await expect(this.page.getByRole("alert").filter({ hasText: text })).toBeVisible();
    return this;
  }

  async seesFieldError(text: string): Promise<this> {
    await expect(this.page.locator("[data-slot=field-error]").filter({ hasText: text })).toBeVisible();
    return this;
  }

  async isAt(path: string, timeout?: number): Promise<this> {
    await expect.poll(() => new URL(this.page.url()).pathname, { timeout }).toBe(path);
    return this;
  }

  async capture(name: string): Promise<this> {
    await this.page.mouse.move(0, 0);
    await fontsLoaded(this.page);
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}
