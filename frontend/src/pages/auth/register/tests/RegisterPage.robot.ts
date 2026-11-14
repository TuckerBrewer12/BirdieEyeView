import { test as base, expect } from "../../../../testing/playwright";
import { AuthScreenRobot, type AuthSeed } from "../../tests/AuthScreen.robot";

export class RegisterRobot extends AuthScreenRobot {
  async open(seed: AuthSeed = {}): Promise<this> {
    await this.visit("/register", "Create account", seed);
    return this;
  }

  async fillIn(details: { name?: string; email?: string; password?: string; confirm?: string }): Promise<this> {
    const password = details.password ?? "birdie123";
    await this.fill("Name", details.name ?? "Sam Snead");
    await this.fill("Email", details.email ?? "sam@example.com");
    await this.fill("Password", password);
    await this.fill("Confirm password", details.confirm ?? password);
    return this;
  }

  async submit(): Promise<this> {
    await this.tap("Create account");
    return this;
  }

  async isWaitingForVerification(email: string): Promise<this> {
    await this.seesHeading("Verify your email");
    await this.isAt("/verify-pending");
    await expect(this.page.getByLabel("Email", { exact: true })).toHaveValue(email);
    return this;
  }
}

export const test = base.extend<{ register: RegisterRobot }>({
  register: async ({ page }, provide) => {
    await provide(new RegisterRobot(page));
  },
});
