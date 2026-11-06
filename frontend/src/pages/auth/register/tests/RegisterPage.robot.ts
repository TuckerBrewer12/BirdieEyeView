import { test as base, expect } from "../../../../testing/playwright";
import { searchableCourses } from "../../../../testing/fixtures/courses";
import { AuthScreenRobot, type AuthSeed } from "../../tests/AuthScreen.robot";

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

  async searchHomeCourse(query: string): Promise<this> {
    await this.fill("Home course (optional)", query);
    return this;
  }

  /** `name` among the home course search's results. */
  async seesCourseResult(name: string): Promise<this> {
    await expect(this.page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
    return this;
  }

  /** Searches for `query` and picks `name` from the results. */
  async pickHomeCourse(query: string, name: string): Promise<this> {
    await this.searchHomeCourse(query);
    await this.page.getByRole("button", { name: new RegExp(name) }).click();
    return this;
  }

  /** `name` picked as the home course, in place of the search. */
  async seesHomeCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name, { exact: true })).toBeVisible();
    return this;
  }

  async changeHomeCourse(): Promise<this> {
    await this.tap("Change home course");
    await expect(this.page.getByLabel("Home course (optional)", { exact: true })).toBeVisible();
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
