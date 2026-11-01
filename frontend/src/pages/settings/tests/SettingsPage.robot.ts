import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import { TEST_USER, type FakeBackend, type FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { populatedCourses } from "../../../testing/fixtures/courses";
import { expectTheme } from "../../../testing/theme";
import type { User } from "../../../types/golf";

type ThemeLabel = "Light" | "Dark" | "System";
type ColorBlindLabel = "No filter" | "Protanopia" | "Deuteranopia" | "Tritanopia";

/** A golfer with a friend code, a handicap and a home course. */
export function settingsProfile(overrides: Partial<User> = {}): User {
  return {
    id: TEST_USER.user_id,
    friend_code: "BIRD-1234",
    name: TEST_USER.name,
    email: TEST_USER.email,
    home_course_id: "course-pebble",
    handicap: 8.4,
    created_at: null,
    scoring_goal: null,
    ...overrides,
  };
}

/** Screen robot for /settings. */
export class SettingsRobot {
  private readonly page: Page;
  private backend: FakeBackend | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  private themeControl() {
    return this.page.getByRole("group", { name: "Theme" });
  }

  private themeOption(label: ThemeLabel) {
    return this.themeControl().getByRole("button", { name: label, exact: true });
  }

  private colorBlindOption(label: ColorBlindLabel) {
    return this.page
      .getByRole("group", { name: "Color blind mode" })
      .getByRole("button", { name: label, exact: true });
  }

  private updatesCheckbox() {
    return this.page.getByRole("checkbox", { name: "Get updates" });
  }

  private copyButton() {
    return this.page.getByRole("button", { name: /^Cop(y|ied)$/ });
  }

  private handicapField() {
    return this.page.getByLabel("Manual handicap index");
  }

  private saveButton() {
    return this.page.getByRole("button", { name: "Save settings" });
  }

  private leavePrompt() {
    return this.page.getByRole("dialog", { name: "Unsaved changes" });
  }

  private homeCourseCard() {
    return this.page.locator('[data-slot="card"]').filter({
      has: this.page.getByText("Home course", { exact: true }),
    });
  }

  /** Starts the player on Dark; init scripts rerun on reload, so a later pick is left alone. */
  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      if (localStorage.getItem("theme") === null) localStorage.setItem("theme", "dark");
    });
    return this;
  }

  async open(seed: FakeBackendSeed = {}): Promise<this> {
    this.backend = await FakeSession.install(this.page, {
      profile: settingsProfile(),
      courses: populatedCourses,
      ...seed,
    });
    await this.page.goto("/settings");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.themeControl()).toBeVisible();
    return this;
  }

  async openFailed(): Promise<this> {
    this.backend = await FakeSession.install(this.page, { profileError: "User not found" });
    await this.page.goto("/settings");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByRole("alert")).toBeVisible();
    return this;
  }

  /** The next load of settings succeeds, as the API would answer once the failure has cleared. */
  nextLoadSucceeds(): this {
    if (!this.backend) return this;
    this.backend.profileError = null;
    if (!this.backend.profile) this.backend.profile = settingsProfile();
    if (this.backend.store.courses.length === 0) this.backend.store.courses = [...populatedCourses];
    return this;
  }

  async tryAgain(): Promise<this> {
    await this.page.getByRole("button", { name: "Try again" }).click();
    return this;
  }

  /** The failed-load alert is gone and the settings form is on screen. */
  async seesForm(): Promise<this> {
    await expect(this.page.getByRole("alert")).toHaveCount(0);
    await expect(this.themeControl()).toBeVisible();
    await expect(this.saveButton()).toBeVisible();
    return this;
  }

  async reload(): Promise<this> {
    await this.page.reload();
    await expect(this.themeControl()).toBeVisible();
    return this;
  }

  /** The next save fails with this message, as the API would answer. */
  failSavesWith(detail: string): this {
    if (this.backend) this.backend.updateUserError = detail;
    return this;
  }

  async pickTheme(label: ThemeLabel): Promise<this> {
    await this.themeOption(label).click();
    return this;
  }

  async seesThemePicked(label: ThemeLabel): Promise<this> {
    await expect(this.themeOption(label)).toHaveAttribute("aria-pressed", "true");
    return this;
  }

  async seesTheme(theme: "light" | "dark"): Promise<this> {
    await expectTheme(this.page, theme);
    return this;
  }

  async pickColorBlindMode(label: ColorBlindLabel): Promise<this> {
    await this.colorBlindOption(label).click();
    return this;
  }

  async seesColorBlindMode(label: ColorBlindLabel): Promise<this> {
    await expect(this.colorBlindOption(label)).toHaveAttribute("aria-pressed", "true");
    return this;
  }

  async turnOffUpdates(): Promise<this> {
    await this.updatesCheckbox().uncheck();
    return this;
  }

  async seesUpdatesOff(): Promise<this> {
    await expect(this.updatesCheckbox()).not.toBeChecked();
    return this;
  }

  /** Lets the page write to and read from the clipboard, as a player who allowed it would. */
  async allowClipboard(): Promise<this> {
    await this.page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    return this;
  }

  /** The browser turns clipboard writes down, as it does without permission or focus. */
  async blockClipboard(): Promise<this> {
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("Write permission denied.")) },
      });
    });
    return this;
  }

  async copyFriendCode(): Promise<this> {
    await this.copyButton().click();
    return this;
  }

  async seesCopied(code: string): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
    await expect.poll(() => this.page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    return this;
  }

  async seesCopyFailed(): Promise<this> {
    await expect(this.page.getByRole("alert").filter({ hasText: "Could not copy your friend code." })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Copy", exact: true })).toBeVisible();
    return this;
  }

  async typeHandicap(value: string): Promise<this> {
    await this.handicapField().fill(value);
    return this;
  }

  async seesHandicap(value: string): Promise<this> {
    await expect(this.handicapField()).toHaveValue(value);
    return this;
  }

  async seesHandicapError(): Promise<this> {
    await expect(this.handicapField()).toHaveAttribute("aria-invalid", "true");
    await expect(this.page.getByText(/Handicap must be/)).toBeVisible();
    return this;
  }

  async searchHomeCourse(query: string): Promise<this> {
    await this.homeCourseCard().getByPlaceholder("Search courses…").fill(query);
    return this;
  }

  async pickHomeCourse(name: string): Promise<this> {
    await this.homeCourseCard().getByRole("button", { name: new RegExp(name) }).click();
    return this;
  }

  async seesCourseResult(name: string): Promise<this> {
    await expect(this.homeCourseCard().getByRole("button", { name: new RegExp(name) })).toBeVisible();
    return this;
  }

  async removeHomeCourse(): Promise<this> {
    await this.page.getByRole("button", { name: "Remove home course" }).click();
    return this;
  }

  async seesHomeCourse(name: string): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Remove home course" })).toBeVisible();
    await expect(this.homeCourseCard().getByText(name, { exact: true })).toBeVisible();
    return this;
  }

  async seesNoHomeCourse(): Promise<this> {
    await expect(this.homeCourseCard().getByPlaceholder("Search courses…")).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Remove home course" })).toHaveCount(0);
    return this;
  }

  async save(): Promise<this> {
    await this.saveButton().click();
    return this;
  }

  async seesSaved(): Promise<this> {
    await expect(this.page.getByText("Settings saved.")).toBeVisible();
    return this;
  }

  async seesSaveError(message: string): Promise<this> {
    await expect(this.page.getByRole("alert").filter({ hasText: message })).toBeVisible();
    return this;
  }

  async cannotSave(): Promise<this> {
    await expect(this.saveButton()).toBeDisabled();
    return this;
  }

  async leaveTo(label: string): Promise<this> {
    await this.page.getByRole("link", { name: label, exact: true }).click();
    return this;
  }

  /** Back to /settings through the nav, keeping the same backend. */
  async returnToSettings(): Promise<this> {
    await this.leaveTo("Settings");
    await expect(this.themeControl()).toBeVisible();
    return this;
  }

  async seesLeavePrompt(): Promise<this> {
    await expect(this.leavePrompt()).toBeVisible();
    return this;
  }

  async saveAndLeave(): Promise<this> {
    await this.leavePrompt().getByRole("button", { name: "Save and leave" }).click();
    return this;
  }

  async discardAndLeave(): Promise<this> {
    await this.leavePrompt().getByRole("button", { name: "Discard changes" }).click();
    return this;
  }

  async stay(): Promise<this> {
    await this.leavePrompt().getByRole("button", { name: "Close" }).click();
    await expect(this.leavePrompt()).toHaveCount(0);
    return this;
  }

  /** Left without stopping on the unsaved-changes prompt, or after answering it. */
  async isAt(path: string): Promise<this> {
    await expect(this.leavePrompt()).toHaveCount(0);
    await expect.poll(() => new URL(this.page.url()).pathname).toBe(path);
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ settings: SettingsRobot }>({
  settings: async ({ page }, provide) => {
    await provide(new SettingsRobot(page));
  },
});
