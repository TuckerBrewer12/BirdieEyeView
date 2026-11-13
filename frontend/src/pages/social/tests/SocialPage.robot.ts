import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import { TEST_USER } from "../../../testing/fakes/FakeBackend";
import type { FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { FriendsInboxRobot } from "../inbox/tests/FriendsInboxPage.robot";

/** Screen robot for /social — same idea as an Android Espresso robot. */
export class SocialRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get codeInput() {
    return this.page.getByLabel("Friend code");
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  async open(friends: FakeBackendSeed["friends"] = {}): Promise<this> {
    await FakeSession.install(this.page, {
      friends,
      profile: {
        id: TEST_USER.user_id,
        name: TEST_USER.name,
        email: TEST_USER.email,
        friend_code: "TGOLF7Q2",
        home_course_id: null,
        handicap: null,
        created_at: null,
        scoring_goal: null,
      },
    });
    await this.page.goto("/social");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.codeInput).toBeVisible();
    await expect(this.page.getByText("Loading friends…")).toHaveCount(0);
    return this;
  }

  async openFailed(message: string): Promise<this> {
    await this.open({ loadError: message });
    return this.seesError(message);
  }

  async doesNotSeeEmptyState(): Promise<this> {
    await expect(this.page.getByText("No friends yet.")).toHaveCount(0);
    return this;
  }

  async typeCode(code: string): Promise<this> {
    await this.codeInput.fill(code);
    return this;
  }

  async tapSend(): Promise<this> {
    await this.page.getByRole("button", { name: "Send", exact: true }).click();
    return this;
  }

  async tapRequests(): Promise<FriendsInboxRobot> {
    await this.page.getByRole("button", { name: /^Requests/ }).click();
    return new FriendsInboxRobot(this.page).isOpen();
  }

  /** The Requests button's count of requests waiting for an answer, or none. */
  async seesOpenRequests(count: number): Promise<this> {
    const name = count > 0 ? `Requests, ${count} new` : "Requests";
    await expect(this.page.getByRole("button", { name, exact: true })).toBeVisible();
    return this;
  }

  /** Lets the page write to and read from the clipboard, as a golfer who allowed it would. */
  async allowClipboard(): Promise<this> {
    await this.page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    return this;
  }

  async copyMyCode(): Promise<this> {
    await this.page.getByRole("button", { name: "Copy your code" }).click();
    return this;
  }

  async seesCopied(code: string): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Copied" })).toBeVisible();
    await expect.poll(() => this.page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    return this;
  }

  async seesMyCode(code: string): Promise<this> {
    await expect(this.page.getByText(code, { exact: true })).toBeVisible();
    return this;
  }

  /** The line under a friend's name: their index and when they last played. */
  async seesFriendDetail(name: string, detail: string): Promise<this> {
    await expect(this.page.locator("[data-slot=person-row]").filter({ hasText: name })).toContainText(detail);
    return this;
  }

  /** Compare (the whole row on a phone) opens Profile set against the friend. */
  async tapCompare(name: string): Promise<this> {
    await this.page.getByRole("link", { name: `Compare with ${name}` }).click();
    await expect(this.page).toHaveURL(/\/analytics\?tab=profile&friend=/);
    return this;
  }

  async isOpen(): Promise<this> {
    await expect(this.page).toHaveURL(/\/social$/);
    await expect(this.codeInput).toBeVisible();
    return this;
  }

  async seesCode(code: string): Promise<this> {
    await expect(this.codeInput).toHaveValue(code);
    return this;
  }

  async seesSent(): Promise<this> {
    await expect(this.page.getByText("Friend request sent.")).toBeVisible();
    return this;
  }

  async seesError(message: string): Promise<this> {
    await expect(this.page.getByRole("alert").filter({ hasText: message })).toBeVisible();
    return this;
  }

  async seesFriend(name: string): Promise<this> {
    await expect(this.page.getByText(name, { exact: true })).toBeVisible();
    return this;
  }

  async doesNotSeeFriend(name: string): Promise<this> {
    await expect(this.page.getByText(name, { exact: true })).toHaveCount(0);
    return this;
  }

  async seesEmptyState(): Promise<this> {
    await expect(this.page.getByText("No friends yet.")).toBeVisible();
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ social: SocialRobot }>({
  social: async ({ page }, provide) => {
    await provide(new SocialRobot(page));
  },
});
