import { test as base, expect, type Page } from "@playwright/test";
import { FakeSession } from "../../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../../testing/fakes/FakeBackend";

/** Screen robot for `/login`, signed out. */
export class LoginRobot {
  private readonly page: Page;
  backend: FakeBackend | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("public_theme", "dark");
    });
    return this;
  }

  async open(
    seed: Omit<FakeBackendSeed, "signedOut"> = {},
    state?: { email?: string; flash?: string },
  ): Promise<this> {
    this.backend = await FakeSession.install(this.page, { ...seed, signedOut: true });
    if (state) {
      // Router state only arrives through navigation, so land on `/` and push.
      await this.page.goto("/");
      await this.page.evaluate((routeState) => {
        window.history.pushState({ usr: routeState, key: "robot", idx: 1 }, "", "/login");
        window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
      }, state);
    } else {
      await this.page.goto("/login");
    }
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    return this;
  }

  async typeEmail(email: string): Promise<this> {
    await this.page.getByLabel("Email").fill(email);
    return this;
  }

  async typePassword(password: string): Promise<this> {
    await this.page.getByLabel("Password", { exact: true }).fill(password);
    return this;
  }

  async signIn(email: string, password: string): Promise<this> {
    await this.typeEmail(email);
    await this.typePassword(password);
    await this.page.getByRole("button", { name: "Sign In" }).click();
    return this;
  }

  async revealPassword(): Promise<this> {
    await this.page.getByRole("button", { name: "Show password" }).click();
    return this;
  }

  async tapResend(): Promise<this> {
    await this.page.getByRole("button", { name: "Resend Verification Email" }).click();
    return this;
  }

  async seesError(text: string): Promise<this> {
    await expect(this.page.getByRole("alert")).toContainText(text);
    return this;
  }

  async seesStatus(text: string): Promise<this> {
    await expect(this.page.getByRole("status").filter({ hasText: text })).toBeVisible();
    return this;
  }

  async seesEmail(email: string): Promise<this> {
    await expect(this.page.getByLabel("Email")).toHaveValue(email);
    return this;
  }

  async seesPasswordShown(): Promise<this> {
    await expect(this.page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
    return this;
  }

  async doesNotSeeResend(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Resend Verification Email" })).toHaveCount(0);
    return this;
  }

  async isSignedIn(): Promise<this> {
    await expect(this.page).toHaveURL(/\/$/);
    await expect(this.page.getByRole("heading", { name: "Sign In" })).toHaveCount(0);
    return this;
  }

  async capture(name: string): Promise<this> {
    // A click leaves the pointer over the button it hit; park it so no
    // baseline depends on a hover state.
    await this.page.mouse.move(0, 0);
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ login: LoginRobot }>({
  login: async ({ page }, provide) => {
    await provide(new LoginRobot(page));
  },
});
