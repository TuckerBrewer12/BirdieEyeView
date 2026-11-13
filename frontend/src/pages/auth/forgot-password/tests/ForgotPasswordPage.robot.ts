import { test as base } from "../../../../testing/playwright";
import { AuthScreenRobot, type AuthSeed } from "../../tests/AuthScreen.robot";

/** Screen robot for `/forgot-password`, signed out. */
export class ForgotPasswordRobot extends AuthScreenRobot {
  async open(seed: AuthSeed = {}): Promise<this> {
    await this.visit("/forgot-password", "Reset password", seed);
    return this;
  }

  async requestLink(email: string): Promise<this> {
    await this.fill("Email", email);
    await this.tap("Send reset link");
    return this;
  }
}

export const test = base.extend<{ forgot: ForgotPasswordRobot }>({
  forgot: async ({ page }, provide) => {
    await provide(new ForgotPasswordRobot(page));
  },
});
