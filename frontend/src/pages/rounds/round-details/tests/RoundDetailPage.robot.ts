import { test as base, expect, type Page } from "@playwright/test";
import type { Round } from "../../../../types/golf";
import { FakeSession } from "../../../../testing/fakes/FakeSession";
import type { FakeBackendSeed } from "../../../../testing/fakes/FakeBackend";
import { formatCourseName } from "../../../../lib/courseName";

/** Screen robot for /rounds/:id — same idea as an Android Espresso robot. */
export class RoundDetailRobot {
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
    round: Round,
    seed: Omit<FakeBackendSeed, "detailRounds"> = {},
  ): Promise<this> {
    await FakeSession.install(this.page, { detailRounds: [round], ...seed });
    await this.page.goto(`/rounds/${round.id}`);
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByRole("button", { name: "Rounds" })).toBeVisible();
    const name = formatCourseName(round.course_name_played ?? round.course?.name);
    await expect(this.page.getByText(name).first()).toBeVisible();
    return this;
  }

  async tapBack(): Promise<this> {
    await this.page.getByRole("button", { name: "Rounds" }).click();
    return this;
  }

  async tapEdit(): Promise<this> {
    await this.page.getByRole("button", { name: "Edit" }).click();
    await expect(this.page.getByRole("button", { name: "Save" })).toBeVisible();
    return this;
  }

  async tapCancelEdit(): Promise<this> {
    await this.page.getByRole("button", { name: "Cancel" }).click();
    await expect(this.page.getByRole("button", { name: "Edit" })).toBeVisible();
    return this;
  }

  async tapDelete(): Promise<this> {
    await this.page.getByRole("button", { name: "Delete" }).click();
    await expect(this.page.getByText("Delete this round?")).toBeVisible();
    return this;
  }

  async cancelDelete(): Promise<this> {
    await this.page.getByRole("button", { name: "Cancel" }).click();
    await expect(this.page.getByText("Delete this round?")).toHaveCount(0);
    return this;
  }

  async confirmDelete(): Promise<this> {
    await this.page.getByRole("button", { name: "Yes" }).click();
    return this;
  }

  async tapLinkCourse(): Promise<this> {
    await this.page.getByRole("button", { name: "Link course" }).click();
    return this;
  }

  async seesLinkPanel(): Promise<this> {
    await expect(this.page.getByText("Link to a saved course")).toBeVisible();
    await expect(this.page.getByPlaceholder("Search courses…")).toBeVisible();
    return this;
  }

  async searchCourses(query: string): Promise<this> {
    await this.page.getByPlaceholder("Search courses…").fill(query);
    return this;
  }

  async pickCourse(name: string): Promise<this> {
    await this.page.getByRole("button", { name: new RegExp(name) }).click();
    return this;
  }

  async seesCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name).first()).toBeVisible();
    return this;
  }

  async doesNotSeeLinkCourse(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Link course" })).toHaveCount(0);
    return this;
  }

  async isAtRounds(): Promise<this> {
    await expect(this.page).toHaveURL(/\/rounds$/);
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ roundDetail: RoundDetailRobot }>({
  roundDetail: async ({ page }, provide) => {
    await provide(new RoundDetailRobot(page));
  },
});
