import { test as base, expect } from "../../../../testing/playwright";
import { searchableCourses } from "../../../../testing/fixtures/courses";
import { AuthScreenRobot, type AuthSeed } from "../../tests/AuthScreen.robot";

/** Screen robot for `/register`, signed out. Saved courses are there to pick a home course from. */
export class RegisterRobot extends AuthScreenRobot {
  async open(seed: AuthSeed = {}): Promise<this> {
    await this.visit("/register", "Create account", { courses: searchableCourses, ...seed });
    return this;
  }

  async fillIn(details: {
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
    handicap?: string;
  }): Promise<this> {
    const password = details.password ?? "birdie123";
    await this.fill("Name", details.name ?? "Sam Snead");
    await this.fill("Email", details.email ?? "sam@example.com");
    await this.fill("Password", password);
    await this.fill("Confirm password", details.confirm ?? password);
    if (details.handicap != null) await this.fill("Handicap (optional)", details.handicap);
    return this;
  }

  /** Types into the home course search and waits for `name` among the results. */
  async searchHomeCourse(query: string, name: string): Promise<this> {
    await this.fill("Home course (optional)", query);
    await expect(this.page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
    return this;
  }

  async pickHomeCourse(query: string, name: string): Promise<this> {
    await this.searchHomeCourse(query, name);
    await this.page.getByRole("button", { name: new RegExp(name) }).click();
    await expect(this.page.getByText(name, { exact: true })).toBeVisible();
    return this;
  }

  async submit(): Promise<this> {
    await this.tap("Create account");
    return this;
  }

  /** Sent on to wait for the verification link, with the email carried over. */
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
