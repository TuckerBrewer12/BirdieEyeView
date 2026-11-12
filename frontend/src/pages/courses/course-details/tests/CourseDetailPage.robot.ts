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
    await expect(this.page.getByRole("button", { name: "Courses", exact: true })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: course.name ?? "" })).toBeVisible();
    return this;
  }

  async seesCourse(name: string): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Courses", exact: true })).toBeVisible();
    await expect(this.page.getByRole("heading", { name })).toBeVisible();
    return this;
  }

  /** The golfer's record at the course and their latest rounds there. */
  async seesRecord(average: string): Promise<this> {
    const record = this.page.locator("[data-slot=course-record]");
    await expect(record.getByText("Average")).toBeVisible();
    await expect(record.getByText(average, { exact: true })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Recent rounds" })).toBeVisible();
    return this;
  }

  /** The scorecard's row of the golfer's average to par per hole. */
  async seesAverageRow(): Promise<this> {
    await expect(this.page.getByRole("rowheader", { name: /^(Your avg|Avg)$/ }).first()).toBeVisible();
    return this;
  }

  async seesNotPlayed(): Promise<this> {
    await expect(this.page.getByText("You haven’t played here yet.")).toBeVisible();
    await expect(this.page.getByRole("rowheader", { name: /^(Your avg|Avg)$/ })).toHaveCount(0);
    return this;
  }

  async tapScanARound(): Promise<this> {
    await this.page.getByRole("button", { name: "Scan a round" }).click();
    return this;
  }

  async isAtScan(): Promise<this> {
    await expect(this.page).toHaveURL(/\/scan$/);
    return this;
  }

  async tapRecentRound(dateLabel: string): Promise<this> {
    await this.page.getByRole("button", { name: new RegExp(`^${dateLabel}`) }).click();
    return this;
  }

  /** The scorecard's bar, naming the tee it reads. */
  async seesTeeLine(line: string): Promise<this> {
    await expect(this.page.locator("[data-slot=course-scorecard]").getByText(line, { exact: true })).toBeVisible();
    return this;
  }

  async isAtRound(id: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`/rounds/${id}`));
    return this;
  }

  async tapTee(color: string): Promise<this> {
    await this.page.getByRole("group", { name: "Tee" }).getByRole("button", { name: color, exact: true }).click();
    return this;
  }

  async seesSelectedTee(color: string): Promise<this> {
    await expect(
      this.page.getByRole("group", { name: "Tee" }).getByRole("button", { name: color, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    return this;
  }

  async openMissing(): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await FakeSession.install(this.page, {});
    await this.page.goto("/courses/missing");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    return this;
  }

  /** The error a course id with no course behind it gets, in place of the course. */
  async seesNotFound(): Promise<this> {
    await expect(this.page.getByRole("alert")).toBeVisible();
    return this;
  }

  async goBack(): Promise<this> {
    await this.page.getByRole("button", { name: "Courses", exact: true }).click();
    await expect(this.page.getByPlaceholder("Search courses")).toBeVisible();
    return this;
  }

  async isAtCourse(id: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`/courses/${id}`));
    await expect(this.page.getByRole("button", { name: "Courses", exact: true })).toBeVisible();
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
