import { type Page } from "@playwright/test";
import { expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";

export type AuthSeed = Omit<FakeBackendSeed, "signedOut">;

/** What every signed-out screen's robot can do: arrive signed out, read the notices, capture. */
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

  /** Lands signed out on `path` and waits for the screen's heading. */
  protected async visit(path: string, heading: string, seed: AuthSeed = {}): Promise<void> {
    this.backend = await FakeSession.install(this.page, { ...seed, signedOut: true });
    await this.page.goto(path);
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await this.seesHeading(heading);
  }

  /**
   * Router state only arrives through navigation, so land on `/` and push `path` with it, the
   * way another screen's `navigate(path, { state })` would.
   */
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

  async isAt(path: string): Promise<this> {
    await expect.poll(() => new URL(this.page.url()).pathname).toBe(path);
    return this;
  }

  async capture(name: string): Promise<this> {
    // A click leaves the pointer over what it hit; park it so no baseline holds a hover.
    await this.page.mouse.move(0, 0);
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}
