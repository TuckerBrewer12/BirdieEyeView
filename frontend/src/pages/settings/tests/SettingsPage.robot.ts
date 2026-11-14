import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import { TEST_USER, type FakeBackend, type FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { populatedCourses } from "../../../testing/fixtures/courses";
import { expectTheme } from "../../../testing/theme";
import type { UserDto } from "../../../types/api";
import { fontsLoaded } from "../../../testing/fontsLoaded";

type ThemeLabel = "Light" | "Dark" | "System";

export function settingsProfile(overrides: Partial<UserDto> = {}): UserDto {
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

  private updatesSwitch() {
    return this.page.getByRole("switch", { name: "Email updates" });
  }

  private copyButton() {
    return this.page.getByRole("button", { name: /^(Copy friend code|Copied)$/ });
  }

  private handicapField() {
    return this.page.getByLabel("Handicap index");
  }

  private saveButton() {
    return this.page.getByRole("button", { name: /^(Save|Saving…)$/ });
  }

  private leavePrompt() {
    return this.page.getByRole("alertdialog", { name: "Save changes before leaving?" });
  }

  private homeCourseRow() {
    return this.page.locator("[data-slot=settings-row]").filter({ hasText: /^Home course/ });
  }

  private homeCourseSheet() {
    return this.page.getByRole("dialog", { name: "Home course" });
  }

  private async openHomeCourse() {
    if (await this.homeCourseSheet().isVisible()) return;
    await this.homeCourseRow().click();
    await expect(this.homeCourseSheet()).toBeVisible();
  }

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
    this.backend = await FakeSession.install(this.page, {
      profile: settingsProfile(),
      courses: populatedCourses,
      profileError: "User not found",
    });
    await this.page.goto("/settings");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await this.seesLoadError();
    return this;
  }

  async seesLoadError(): Promise<this> {
    await expect(this.page.getByRole("alert")).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Try again" })).toBeVisible();
    return this;
  }

  nextLoadSucceeds(): this {
    if (this.backend) this.backend.profileError = null;
    return this;
  }

  async tryAgain(): Promise<this> {
    await this.page.getByRole("button", { name: "Try again" }).click();
    return this;
  }

  async seesForm(): Promise<this> {
    await expect(this.page.getByRole("alert")).toHaveCount(0);
    await expect(this.themeControl()).toBeVisible();
    await expect(this.page.locator("main").getByRole("button", { name: "Sign out" })).toBeVisible();
    return this;
  }

  async reload(): Promise<this> {
    await this.page.reload();
    await expect(this.themeControl()).toBeVisible();
    return this;
  }

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

  async turnOffUpdates(): Promise<this> {
    await this.updatesSwitch().click();
    return this;
  }

  async seesUpdatesOff(): Promise<this> {
    await expect(this.updatesSwitch()).not.toBeChecked();
    return this;
  }

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
    await expect(this.page.getByRole("button", { name: "Copy friend code", exact: true })).toBeVisible();
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
    await this.openHomeCourse();
    await this.homeCourseSheet().getByPlaceholder("Search courses…").fill(query);
    return this;
  }

  async pickHomeCourse(name: string): Promise<this> {
    await this.homeCourseSheet().getByRole("option", { name: new RegExp(name) }).click();
    await expect(this.homeCourseSheet()).toHaveCount(0);
    return this;
  }

  async seesCourseResult(name: string): Promise<this> {
    await expect(this.homeCourseSheet().getByRole("option", { name: new RegExp(name) })).toBeVisible();
    return this;
  }

  async removeHomeCourse(): Promise<this> {
    await this.openHomeCourse();
    await this.homeCourseSheet().getByRole("button", { name: "Remove home course" }).click();
    await this.page.keyboard.press("Escape");
    await expect(this.homeCourseSheet()).toHaveCount(0);
    return this;
  }

  async seesHomeCourse(name: string): Promise<this> {
    await expect(this.homeCourseRow()).toContainText(name);
    return this;
  }

  async seesNoHomeCourse(): Promise<this> {
    await expect(this.homeCourseRow()).toContainText("None");
    return this;
  }

  async discard(): Promise<this> {
    await this.page.locator("[data-slot=action-bar]").getByRole("button", { name: "Discard" }).click();
    await expect(this.saveButton()).toHaveCount(0);
    return this;
  }

  async signOut(): Promise<this> {
    await this.page.locator("main").getByRole("button", { name: "Sign out" }).click();
    return this;
  }

  async seesSignedOut(): Promise<this> {
    await expect(this.page).toHaveURL(/\/$/);
    await expect.poll(() => this.backend?.signedOut).toBe(true);
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

  async seesUnsaved(): Promise<this> {
    await expect(this.saveButton()).toBeEnabled();
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

  async returnToSettings(): Promise<this> {
    await this.leaveTo("Settings");
    await expect(this.themeControl()).toBeVisible();
    return this;
  }

  async seesLeavePrompt(): Promise<this> {
    await expect(this.leavePrompt()).toBeVisible();
    return this;
  }

  async seesLeavePromptError(message: string): Promise<this> {
    await expect(this.leavePrompt().getByRole("alert").filter({ hasText: message })).toBeVisible();
    return this;
  }

  async saveAndLeave(): Promise<this> {
    await this.leavePrompt().getByRole("button", { name: "Save", exact: true }).click();
    return this;
  }

  async discardAndLeave(): Promise<this> {
    await this.leavePrompt().getByRole("button", { name: "Discard", exact: true }).click();
    return this;
  }

  async stay(): Promise<this> {
    await this.leavePrompt().getByRole("button", { name: "Keep editing" }).click();
    await expect(this.leavePrompt()).toHaveCount(0);
    return this;
  }

  async isAt(path: string): Promise<this> {
    await expect(this.leavePrompt()).toHaveCount(0);
    await expect.poll(() => new URL(this.page.url()).pathname).toBe(path);
    return this;
  }

  async staysAt(path: string): Promise<this> {
    await expect.poll(() => new URL(this.page.url()).pathname).toBe(path);
    return this;
  }

  async capture(name: string): Promise<this> {
    await fontsLoaded(this.page);
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ settings: SettingsRobot }>({
  settings: async ({ page }, provide) => {
    await provide(new SettingsRobot(page));
  },
});
