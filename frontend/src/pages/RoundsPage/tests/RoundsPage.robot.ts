import { expect, type Page } from "@playwright/test";
import type { RoundSummary } from "../../../types/golf";
import { mockAuthenticatedSession } from "../../../testing/helpers/auth";

/** Screen robot for /rounds — same idea as Android Espresso/Kakao robots. */
export class RoundsRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async open(rounds: RoundSummary[]): Promise<this> {
    await mockAuthenticatedSession(this.page, rounds);
    await this.page.goto("/rounds");
    await this.page.evaluate(() => document.fonts.ready);
    await expect(this.page.getByPlaceholder("Search by course…")).toBeVisible();
    return this;
  }

  async seesCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name).first()).toBeVisible();
    return this;
  }

  async seesEmptyState(): Promise<this> {
    await expect(this.page.getByText("No rounds found.")).toBeVisible();
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
