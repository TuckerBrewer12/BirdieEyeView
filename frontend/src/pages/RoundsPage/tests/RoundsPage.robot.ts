import { expect, type Locator, type Page } from "@playwright/test";
import type { RoundSummary } from "../../../types/golf";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackendSeed } from "../../../testing/fakes/FakeBackend";

/** Screen robot for /rounds — same idea as Android Espresso/Kakao robots. */
export class RoundsRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private courseLabel(name: string): Locator {
    return this.page.locator("span").filter({ hasText: new RegExp(`^${name}$`) });
  }

  async open(
    rounds: RoundSummary[],
    seed: Omit<FakeBackendSeed, "rounds"> = {},
  ): Promise<this> {
    await FakeSession.install(this.page, { rounds, ...seed });
    await this.page.goto("/rounds");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByPlaceholder("Search by course…")).toBeVisible();
    return this;
  }

  async search(query: string): Promise<this> {
    await this.page.getByPlaceholder("Search by course…").fill(query);
    return this;
  }

  async tapChip(label: string): Promise<this> {
    await this.page.getByRole("button", { name: label, exact: true }).click();
    return this;
  }

  async sortBy(label: string): Promise<this> {
    await this.page.getByRole("combobox", { name: "Sort by" }).click();
    await this.page.getByRole("option", { name: label, exact: true }).click();
    return this;
  }

  async tapRound(courseName: string): Promise<this> {
    await this.courseLabel(courseName).first().click();
    return this;
  }

  async openLinkFor(courseName: string): Promise<this> {
    await this.page
      .getByRole("button", { name: `Link ${courseName} to a saved course` })
      .click();
    return this;
  }

  async closeLink(): Promise<this> {
    await this.page.getByRole("button", { name: "Close" }).click();
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

  async loadMore(): Promise<this> {
    await this.page.getByRole("button", { name: /Load more/ }).click();
    return this;
  }

  async seesCourse(name: string): Promise<this> {
    await expect(this.courseLabel(name).first()).toBeVisible();
    return this;
  }

  async doesNotSeeCourse(name: string): Promise<this> {
    await expect(this.courseLabel(name)).toHaveCount(0);
    return this;
  }

  async seesEmptyState(): Promise<this> {
    await expect(this.page.getByText("No rounds found.")).toBeVisible();
    return this;
  }

  async seesLinkPanel(courseName: string): Promise<this> {
    await expect(
      this.page.getByText(`Link "${courseName}" to a saved course`),
    ).toBeVisible();
    await this.page.getByPlaceholder("Search courses…").scrollIntoViewIfNeeded();
    return this;
  }

  async doesNotSeeLinkPanel(): Promise<this> {
    await expect(this.page.getByPlaceholder("Search courses…")).toHaveCount(0);
    return this;
  }

  async seesRoundCount(n: number): Promise<this> {
    const label = n === 1 ? "1 round" : `${n} rounds`;
    await expect(this.page.getByText(label, { exact: true }).first()).toBeVisible();
    return this;
  }

  async isAtRound(id: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`/rounds/${id}`));
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export async function onRounds(
  page: Page,
  run: (rounds: RoundsRobot) => Promise<void>,
): Promise<void> {
  await run(new RoundsRobot(page));
}
