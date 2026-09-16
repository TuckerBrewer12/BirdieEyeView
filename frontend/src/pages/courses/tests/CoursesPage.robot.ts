import { test as base, expect, type Page } from "@playwright/test";
import type { CourseSummary } from "../../../types/golf";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackendSeed } from "../../../testing/fakes/FakeBackend";

/** Screen robot for /courses — same idea as an Android Espresso robot. */
export class CoursesRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("settings_theme", "dark");
      localStorage.setItem("public_theme", "dark");
    });
    return this;
  }

  async open(
    courses: CourseSummary[],
    seed: Omit<FakeBackendSeed, "courses"> = {},
  ): Promise<this> {
    await FakeSession.install(this.page, { courses, ...seed });
    await this.page.goto("/courses");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByPlaceholder("Search courses...")).toBeVisible();
    return this;
  }

  async openFailed(): Promise<this> {
    await FakeSession.install(this.page, { coursesError: "Could not load courses." });
    await this.page.goto("/courses");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByRole("alert")).toBeVisible();
    return this;
  }

  async search(query: string): Promise<this> {
    await this.page.getByPlaceholder("Search courses...").fill(query);
    return this;
  }

  async seesCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name).first()).toBeVisible();
    return this;
  }

  async doesNotSeeCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name)).toHaveCount(0);
    return this;
  }

  async seesEmptyState(): Promise<this> {
    await expect(this.page.getByText("No courses found.")).toBeVisible();
    return this;
  }

  async doesNotSeeEmptyState(): Promise<this> {
    await expect(this.page.getByText("No courses found.")).toHaveCount(0);
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ courses: CoursesRobot }>({
  courses: async ({ page }, provide) => {
    await provide(new CoursesRobot(page));
  },
});
