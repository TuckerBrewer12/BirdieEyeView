import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../../testing/playwright";
import type { RoundDto } from "../../../../types/api";
import { FakeSession } from "../../../../testing/fakes/FakeSession";
import type { FakeBackendSeed } from "../../../../testing/fakes/FakeBackend";
import { formatCourseName } from "../../../../domain/course";

/** Screen robot for /rounds/:id — same idea as an Android Espresso robot. */
export class RoundDetailRobot {
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
    round: RoundDto,
    seed: Omit<FakeBackendSeed, "detailRounds"> = {},
  ): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
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
    await this.page.getByRole("button", { name: "Edit", exact: true }).click();
    await this.seesEditing();
    return this;
  }

  /** Edit mode: the round's actions are Save and Cancel. */
  async seesEditing(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    return this;
  }

  async tapCancelEdit(): Promise<this> {
    await this.page.getByRole("button", { name: "Cancel" }).click();
    return this;
  }

  /** Out of edit mode: Edit is back in place of Save. */
  async seesViewActions(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
    return this;
  }

  async typeStrokes(hole: number, strokes: number): Promise<this> {
    await this.page.getByLabel(`Hole ${hole} strokes`).fill(String(strokes));
    return this;
  }

  async clearStrokes(hole: number): Promise<this> {
    await this.page.getByLabel(`Hole ${hole} strokes`).fill("");
    return this;
  }

  async tapSave(): Promise<this> {
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(this.page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
    return this;
  }

  async seesScore(score: number): Promise<this> {
    const summary = this.page.locator('[data-slot="round-summary"]');
    await expect(summary.getByText(String(score), { exact: true }).first()).toBeVisible();
    return this;
  }

  /** The net score in the summary and the course handicap it came off, as the server sent them. */
  async seesNet(net: number, courseHandicap: number): Promise<this> {
    const summary = this.page.locator('[data-slot="round-summary"]');
    await expect(summary.getByText(`Net · hcp ${courseHandicap}`, { exact: true }).locator("..")).toContainText(String(net));
    return this;
  }

  /** A dash where the net was: no net until the edit is saved. */
  async seesNoNet(): Promise<this> {
    const summary = this.page.locator('[data-slot="round-summary"]');
    await expect(summary.getByText("Net", { exact: true }).locator("..")).toContainText("—");
    return this;
  }

  async tapTee(color: string): Promise<this> {
    await this.page.getByRole("group", { name: "Tee" }).getByRole("button", { name: new RegExp(`^${color}`, "i") }).click();
    return this;
  }

  /** The text field a round gets when its course has no tees to pick from. */
  async seesTeeField(): Promise<this> {
    await expect(this.page.getByRole("textbox", { name: "Tee" })).toBeVisible();
    return this;
  }

  async typeTee(tee: string): Promise<this> {
    await this.page.getByRole("textbox", { name: "Tee" }).fill(tee);
    return this;
  }

  /** The tee on the date line over the course name. */
  async seesTee(tee: string): Promise<this> {
    await expect(this.page.locator('[data-slot="round-title"]')).toContainText(`${tee} tees`);
    return this;
  }

  /** Delete sits in the More menu. */
  async tapDelete(): Promise<this> {
    await this.page.getByRole("button", { name: "More actions" }).click();
    await this.page.getByRole("menuitem", { name: "Delete round" }).click();
    return this;
  }

  async seesDeleteConfirm(): Promise<this> {
    const dialog = this.page.getByRole("alertdialog");
    await expect(dialog.getByText("Delete this round?")).toBeVisible();
    await expect(dialog.getByText(/Your stats and handicap will update/)).toBeVisible();
    return this;
  }

  async cancelDelete(): Promise<this> {
    await this.page.getByRole("button", { name: "Cancel" }).click();
    await expect(this.page.getByText("Delete this round?")).toHaveCount(0);
    return this;
  }

  async confirmDelete(): Promise<this> {
    await this.page.getByRole("button", { name: "Delete round" }).click();
    return this;
  }

  /** "Link to a course" sits in the More menu of a round with no course behind it. */
  async tapLinkCourse(): Promise<this> {
    await this.page.getByRole("button", { name: "More actions" }).click();
    await this.page.getByRole("menuitem", { name: "Link to a course" }).click();
    return this;
  }

  async seesLinkPanel(): Promise<this> {
    await expect(this.page.getByText("Link to a course", { exact: true })).toBeVisible();
    await expect(this.page.getByPlaceholder("Search courses…")).toBeVisible();
    return this;
  }

  async seesLinkError(message: string): Promise<this> {
    await expect(this.page.getByRole("alert").filter({ hasText: message })).toBeVisible();
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

  async seesCourseSearchField(): Promise<this> {
    await expect(this.page.getByPlaceholder("Search courses…")).toBeVisible();
    return this;
  }

  async saveAsCustomName(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Save as “${name}”` }).click();
    return this;
  }

  async seesCustomNameCard(name: string): Promise<this> {
    await expect(this.page.getByText(name).first()).toBeVisible();
    await expect(this.page.getByText("Custom name · not linked to a course")).toBeVisible();
    await expect(this.page.getByPlaceholder("Search courses…")).toHaveCount(0);
    return this;
  }

  async seesLinkedCard(name: string): Promise<this> {
    await expect(this.page.getByText("Linked", { exact: true })).toBeVisible();
    await expect(this.page.getByText(name).first()).toBeVisible();
    await expect(this.page.getByPlaceholder("Search courses…")).toHaveCount(0);
    return this;
  }

  async tapChangeCourse(): Promise<this> {
    await this.page.getByRole("button", { name: "Change course" }).click();
    return this;
  }

  async tapKeepPlayedName(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Keep "${name}" without linking` }).click();
    return this;
  }

  async tapEditCourseName(): Promise<this> {
    await this.page.getByRole("button", { name: "Link course" }).click();
    return this;
  }

  async seesCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name).first()).toBeVisible();
    return this;
  }

  /** A linked round's More menu holds Delete alone. */
  async doesNotSeeLinkCourse(): Promise<this> {
    await this.page.getByRole("button", { name: "More actions" }).click();
    await expect(this.page.getByRole("menuitem", { name: "Delete round" })).toBeVisible();
    await expect(this.page.getByRole("menuitem", { name: "Link to a course" })).toHaveCount(0);
    await this.page.keyboard.press("Escape");
    return this;
  }

  async isAtRounds(): Promise<this> {
    await expect(this.page).toHaveURL(/\/rounds$/);
    return this;
  }

  /** "vs your average", on the window picked, with a figure's row: its name, this round, the average, the difference. */
  async seesComparison(window: string, row: { label: string; average: string; difference: string }): Promise<this> {
    const card = this.page.locator('[data-slot="round-comparison"]');
    await expect(card.getByText("vs your average")).toBeVisible();
    await expect(card.getByRole("button", { name: window, exact: true })).toHaveAttribute("aria-pressed", "true");
    const line = card.getByText(row.label, { exact: true }).locator("..");
    await expect(line).toContainText(row.average);
    await expect(line).toContainText(row.difference);
    return this;
  }

  async tapComparisonWindow(window: string): Promise<this> {
    await this.page.locator('[data-slot="round-comparison"]').getByRole("button", { name: window, exact: true }).click();
    return this;
  }

  async seesNoComparisonYet(): Promise<this> {
    await expect(this.page.getByText("No earlier rounds to compare with yet.")).toBeVisible();
    return this;
  }

  /** `fullPage: false` for a dialog, which sits over the viewport, not the page. */
  async capture(name: string, options: { fullPage?: boolean } = {}): Promise<this> {
    if (await this.page.locator('[data-slot="round-flow"]').isVisible()) {
      await expect(this.page.locator("svg circle").last()).toBeVisible();
    }
    await expect(this.page).toHaveScreenshot(name, { fullPage: options.fullPage ?? true });
    return this;
  }
}

export const test = base.extend<{ roundDetail: RoundDetailRobot }>({
  roundDetail: async ({ page }, provide) => {
    await provide(new RoundDetailRobot(page));
  },
});
