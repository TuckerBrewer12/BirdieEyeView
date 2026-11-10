import { type Locator, type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import type { StoredRound } from "../../../testing/fakes/roundResponses";

/** Screen robot for /rounds — same idea as an Android Espresso robot. */
export class RoundsRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private courseLabel(name: string): Locator {
    return this.page.locator("span").filter({ hasText: new RegExp(`^${name}$`) });
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  async open(
    rounds: StoredRound[],
    seed: Omit<FakeBackendSeed, "rounds"> = {},
  ): Promise<this> {
    await FakeSession.install(this.page, { rounds, ...seed });
    await this.page.goto("/rounds");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.locator("[data-slot=page-title]").getByText("Rounds", { exact: true })).toBeVisible();
    await this.seesScopePressed("All");
    return this;
  }

  async search(query: string): Promise<this> {
    await this.page.getByLabel("Search rounds").fill(query);
    return this;
  }

  /** A phone keeps the search behind an icon. */
  async openSearch(): Promise<this> {
    await this.page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(this.page.getByLabel("Search rounds")).toBeFocused();
    return this;
  }

  async tapScope(label: string): Promise<this> {
    await this.page.getByRole("group", { name: "Scope" }).getByRole("button", { name: label, exact: true }).click();
    return this;
  }

  async seesScopePressed(label: string): Promise<this> {
    await expect(
      this.page.getByRole("group", { name: "Scope" }).getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    return this;
  }

  /** The course menu: a dropdown on desktop, a bottom sheet on a phone. */
  async filterByCourse(name: string): Promise<this> {
    await this.page.getByRole("button", { name: "Course", exact: true }).click();
    await this.page
      .getByRole("menuitemradio", { name, exact: true })
      .or(this.page.locator("[data-slot=sheet-option]").getByText(name, { exact: true }))
      .click();
    return this;
  }

  /** The sort menu open: a dropdown on desktop, a bottom sheet from the title row's icon on a phone. */
  async openSortMenu(): Promise<this> {
    await this.page.getByRole("button", { name: /^Sort by(: .+)?$/ }).click();
    return this;
  }

  async seesSortMenu(): Promise<this> {
    await expect(this.page.locator("[data-slot=sort-menu], [data-slot=sort-sheet]")).toBeVisible();
    return this;
  }

  async sortBy(label: string): Promise<this> {
    await this.openSortMenu();
    await this.page
      .getByRole("menuitemradio", { name: label, exact: true })
      .or(this.page.locator("[data-slot=sheet-option]").getByText(label, { exact: true }))
      .click();
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

  /** Esc closes the panel from its search. */
  async closeLink(): Promise<this> {
    await this.page.getByPlaceholder("Search courses…").press("Escape");
    return this;
  }

  /** The phone's sheet, closed by keeping the round's own name. */
  async keepName(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Keep as “${name}”` }).click();
    return this;
  }

  async seesLinkSheet(line: RegExp): Promise<this> {
    const sheet = this.page.locator("[data-slot=link-sheet]");
    await expect(sheet.getByText("Link to a course")).toBeVisible();
    await expect(sheet.getByText(line)).toBeVisible();
    return this;
  }

  async searchCourses(query: string): Promise<this> {
    await this.page.getByPlaceholder("Search courses…").fill(query);
    return this;
  }

  async pickCourse(name: string): Promise<this> {
    await this.page.getByRole("option", { name: new RegExp(name) }).click();
    return this;
  }

  async seesCourseResult(name: string): Promise<this> {
    await expect(
      this.page.locator("[data-slot=course-result]").filter({ hasText: name }),
    ).toBeVisible();
    return this;
  }

  async doesNotSeeCourseResults(): Promise<this> {
    await expect(this.page.locator("[data-slot=course-result]")).toHaveCount(0);
    return this;
  }

  async seesNoCoursesFound(): Promise<this> {
    await expect(this.page.getByText(/No saved courses match/)).toBeVisible();
    return this;
  }

  async doesNotSeeNoCoursesFound(): Promise<this> {
    await expect(this.page.getByText(/No saved courses match/)).toHaveCount(0);
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

  async seesLinkPanel(): Promise<this> {
    const search = this.page.getByPlaceholder("Search courses…");
    await expect(search).toBeVisible();
    await search.evaluate((el) => {
      el.scrollIntoView({ block: "end", inline: "nearest" });
      const nav = document.querySelector("[data-slot=app-shell-bottom]");
      const extra =
        nav instanceof HTMLElement && getComputedStyle(nav).display !== "none"
          ? nav.getBoundingClientRect().height
          : 0;
      if (extra) window.scrollBy(0, extra);
    });
    await expect(search).toBeVisible();
    return this;
  }

  async seesLinkError(message: string): Promise<this> {
    await expect(this.page.getByRole("alert").filter({ hasText: message })).toBeVisible();
    return this;
  }

  async doesNotSeeLinkPanel(): Promise<this> {
    await expect(this.page.getByPlaceholder("Search courses…")).toHaveCount(0);
    return this;
  }

  /** The round listed first, by its course name. */
  async seesFirstRound(courseName: string): Promise<this> {
    await expect(this.page.locator('[data-slot="round-preview"]').first()).toContainText(courseName);
    return this;
  }

  /** The count beside the title: the rounds on screen. */
  async seesRoundCount(n: number): Promise<this> {
    await expect(this.page.locator("[data-slot=round-count]")).toHaveText(String(n));
    return this;
  }

  async isAtRound(id: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`/rounds/${id}`));
    return this;
  }

  /** `fullPage: false` for an open sheet or menu, which sits over the viewport, not the page. */
  async capture(name: string, options: { fullPage?: boolean } = {}): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: options.fullPage ?? true });
    return this;
  }
}

export const test = base.extend<{ rounds: RoundsRobot }>({
  rounds: async ({ page }, provide) => {
    await provide(new RoundsRobot(page));
  },
});
