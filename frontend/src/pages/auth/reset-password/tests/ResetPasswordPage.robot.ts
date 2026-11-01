import { test as base, expect } from "../../../../testing/playwright";
import { AuthScreenRobot, type AuthSeed } from "../../tests/AuthScreen.robot";

export const RESET_TOKEN = "reset-token-from-email";

/** Screen robot for `/reset-password`, opened from the emailed link. */
export class ResetPasswordRobot extends AuthScreenRobot {
  /** `token` is what the link carries; the backend honours `RESET_TOKEN` unless told otherwise. */
  async open(token: string | null = RESET_TOKEN, seed: AuthSeed = {}): Promise<this> {
    const path = token == null ? "/reset-password" : `/reset-password?token=${token}`;
    await this.visit(path, "Reset password", { resetTokens: [RESET_TOKEN], ...seed });
    return this;
  }

  async choose(password: string, confirm = password): Promise<this> {
    await this.fill("New password", password);
    await this.fill("Confirm password", confirm);
    await this.tap("Reset password");
    return this;
  }

  async seesFieldError(text: string): Promise<this> {
    await expect(this.page.locator("[data-slot=field-error]").filter({ hasText: text })).toBeVisible();
    return this;
  }

  async continueToSignIn(): Promise<this> {
    await this.tap("Continue to sign in");
    return this;
  }
}

export const test = base.extend<{ reset: ResetPasswordRobot }>({
  reset: async ({ page }, provide) => {
    await provide(new ResetPasswordRobot(page));
  },
});
