import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
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
    await FakeSession.install(this.page, { friends });
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

  async tapInbox(): Promise<FriendsInboxRobot> {
    await this.page.getByRole("button", { name: "Inbox" }).click();
    return new FriendsInboxRobot(this.page).isOpen();
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
