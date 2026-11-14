import { test as base } from "../../../../testing/playwright";
import { AuthScreenRobot, type AuthSeed } from "../../tests/AuthScreen.robot";

export const VERIFY_TOKEN = "verify-token-from-email";

export class VerifyEmailRobot extends AuthScreenRobot {
  async open(token: string | null = VERIFY_TOKEN, seed: AuthSeed = {}): Promise<this> {
    const path = token == null ? "/verify-email" : `/verify-email?token=${token}`;
    await this.visit(path, "Email verification", { verifyTokens: [VERIFY_TOKEN], ...seed });
    return this;
  }
}

export const test = base.extend<{ verifyEmail: VerifyEmailRobot }>({
  verifyEmail: async ({ page }, provide) => {
    await provide(new VerifyEmailRobot(page));
  },
});
