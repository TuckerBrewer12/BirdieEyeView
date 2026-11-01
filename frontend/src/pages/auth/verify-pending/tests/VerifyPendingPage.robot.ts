import { test as base, expect } from "../../../../testing/playwright";
import { AuthScreenRobot, type AuthSeed } from "../../tests/AuthScreen.robot";

/** Screen robot for `/verify-pending`, where Register sends a new account. */
export class VerifyPendingRobot extends AuthScreenRobot {
  async open(email: string | null = "sam@example.com", seed: AuthSeed = {}): Promise<this> {
    const path = email == null ? "/verify-pending" : `/verify-pending?email=${encodeURIComponent(email)}`;
    await this.visit(path, "Verify your email", seed);
    return this;
  }

  async seesEmail(email: string): Promise<this> {
    await expect(this.page.getByLabel("Email", { exact: true })).toHaveValue(email);
    return this;
  }

  async resend(): Promise<this> {
    await this.tap("Send another confirmation email");
    return this;
  }
}

export const test = base.extend<{ verifyPending: VerifyPendingRobot }>({
  verifyPending: async ({ page }, provide) => {
    await provide(new VerifyPendingRobot(page));
  },
});
