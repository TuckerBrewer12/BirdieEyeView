import { test as base, expect } from "../../../../testing/playwright";
import { AuthScreenRobot, type AuthSeed } from "../../tests/AuthScreen.robot";

/** Screen robot for `/login`, signed out. */
export class LoginRobot extends AuthScreenRobot {
  async open(seed: AuthSeed = {}): Promise<this> {
    await this.visit("/login", "Sign in", seed);
    return this;
  }

  /** Arrives the way another screen sends someone here, with an email and a line to show. */
  async arriveWith(state: { email?: string; flash?: string }, seed: AuthSeed = {}): Promise<this> {
    await this.visitWithState("/login", "Sign in", state, seed);
    return this;
  }

  async typePassword(password: string): Promise<this> {
    await this.fill("Password", password);
    return this;
  }

  async signIn(email: string, password: string): Promise<this> {
    await this.fill("Email", email);
    await this.typePassword(password);
    await this.tap("Sign in");
    return this;
  }

  async revealPassword(): Promise<this> {
    await this.tap("Show password");
    return this;
  }

  async tapResend(): Promise<this> {
    await this.tap("Resend verification email");
    return this;
  }

  async seesEmail(email: string): Promise<this> {
    await expect(this.page.getByLabel("Email", { exact: true })).toHaveValue(email);
    return this;
  }

  async seesPasswordShown(): Promise<this> {
    await expect(this.page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
    return this;
  }

  /** After a refused sign-in both fields read as wrong; editing either clears that. */
  async seesFieldsMarkedWrong(wrong: boolean): Promise<this> {
    for (const label of ["Email", "Password"]) {
      const field = this.page.getByLabel(label, { exact: true });
      if (wrong) {
        await expect(field).toHaveAttribute("aria-invalid", "true");
        // The field says why: a screen reader reads the alert's words as its description.
        await expect(field).toHaveAccessibleDescription(/\S/);
      } else {
        await expect(field).not.toHaveAttribute("aria-invalid", "true");
      }
    }
    return this;
  }

  /** "Forgot?" beside the password's label, to the reset screen. */
  async tapForgot(): Promise<this> {
    await this.tap("Forgot?");
    await this.isAt("/forgot-password");
    return this;
  }

  async doesNotSeeResend(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Resend verification email" })).toHaveCount(0);
    return this;
  }

  /** Signed in: off this screen and onto the app's home. */
  async isSignedIn(): Promise<this> {
    await this.isAt("/");
    await expect(this.page.getByRole("heading", { name: "Sign in" })).toHaveCount(0);
    return this;
  }
}

export const test = base.extend<{ login: LoginRobot }>({
  login: async ({ page }, provide) => {
    await provide(new LoginRobot(page));
  },
});
