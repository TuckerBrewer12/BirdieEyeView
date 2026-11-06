import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../../testing/playwright";
import type { CourseDto } from "../../../../types/api";
import { FakeSession } from "../../../../testing/fakes/FakeSession";
import type { FakeBackendSeed } from "../../../../testing/fakes/FakeBackend";

/** Screen robot for /courses/:courseId — same idea as an Android Espresso robot. */
export class CourseDetailRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  async open(
    course: CourseDto,
    seed: Omit<FakeBackendSeed, "fullCourses"> = {},
  ): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await FakeSession.install(this.page, { fullCourses: [course], ...seed });
    await this.page.goto(`/courses/${course.id}`);
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByRole("button", { name: "Back to courses" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: course.name ?? "" })).toBeVisible();
    return this;
  }

  async seesCourse(name: string): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Back to courses" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name })).toBeVisible();
    return this;
  }

  async tapPerformance(): Promise<this> {
    await this.page.getByRole("button", { name: "My Performance" }).click();
    return this;
  }

  async seesPerformance(): Promise<this> {
    await expect(this.page.getByText("Rounds Played")).toBeVisible();
    await expect(this.page.getByText("Score Trend", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Round History", { exact: true })).toBeVisible();
    return this;
  }

  /** Not played here yet: no tabs, just the course and a way to log a round at it. */
  async seesNotPlayedYet(): Promise<this> {
    await expect(this.page.getByText("You haven't played here yet.")).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Scan a round" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "My Performance" })).toHaveCount(0);
    await expect(this.page.getByRole("button", { name: "Course", exact: true })).toHaveCount(0);
    return this;
  }

  /** Played here: both tabs, and no prompt to scan a first round. */
  async seesPlayedHere(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "My Performance" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Scan a round" })).toHaveCount(0);
    return this;
  }

  async tapScanRound(): Promise<this> {
    await this.page.getByRole("button", { name: "Scan a round" }).click();
    return this;
  }

  /** On the scan page's upload step, with `courseName` picked ahead of the scan. */
  async isScanningAt(courseName: string): Promise<this> {
    await expect(this.page).toHaveURL(/\/scan$/);
    await expect(this.page.getByText("Drop your scorecard here")).toBeVisible();
    await expect(this.page.getByText(courseName, { exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Clear course" })).toBeVisible();
    return this;
  }

  async tapHistoryRound(dateLabel: string): Promise<this> {
    await this.page.getByText(dateLabel, { exact: true }).click();
    return this;
  }

  async isAtRound(id: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`/rounds/${id}`));
    return this;
  }

  async tapTee(color: string): Promise<this> {
    await this.page.getByRole("button", { name: new RegExp(`^${color}\\b`) }).click();
    return this;
  }

  async seesSelectedTee(color: string): Promise<this> {
    await expect(this.page.getByRole("button", { name: new RegExp(`^${color}\\b`) })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    return this;
  }

  async openMissing(): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await FakeSession.install(this.page, {});
    await this.page.goto("/courses/missing");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByRole("alert")).toBeVisible();
    return this;
  }

  async goBack(): Promise<this> {
    await this.page.getByRole("button", { name: "Back to courses" }).click();
    await expect(this.page.getByPlaceholder("Search courses...")).toBeVisible();
    return this;
  }

  async isAtCourse(id: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`/courses/${id}`));
    await expect(this.page.getByRole("button", { name: "Back to courses" })).toBeVisible();
    return this;
  }

  async isAtCourses(): Promise<this> {
    await expect(this.page).toHaveURL(/\/courses$/);
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ courseDetail: CourseDetailRobot }>({
  courseDetail: async ({ page }, provide) => {
    await provide(new CourseDetailRobot(page));
  },
});
