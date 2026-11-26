import { test as base } from "../../../../testing/playwright";
import { LoginRobot } from "../../login/tests/LoginPage.robot";
import { AuthScreenRobot, type AuthSeed } from "../../tests/AuthScreen.robot";

export class ForgotPasswordRobot extends AuthScreenRobot {
  async open(seed: AuthSeed = {}): Promise<this> {
    await this.visit("/forgot-password", "Reset password", seed);
    return this;
  }

  async backToSignIn(): Promise<LoginRobot> {
    await this.tap("Back to sign in");
    await this.isAt("/login");
    return new LoginRobot(this.page);
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
