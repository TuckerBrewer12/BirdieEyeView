import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../../testing/playwright";
import { FakeSession } from "../../../../testing/fakes/FakeSession";
import type { FakeBackendSeed } from "../../../../testing/fakes/FakeBackend";
import { SocialRobot } from "../../tests/SocialPage.robot";

export class FriendsInboxRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private row(name: string) {
    return this.page.locator("[data-slot=person-row]").filter({ hasText: name });
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  async open(friends: FakeBackendSeed["friends"] = {}): Promise<this> {
    await FakeSession.install(this.page, { friends });
    await this.page.goto("/inbox");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    return this.isOpen();
  }

  async openFailed(message: string): Promise<this> {
    await this.open({ loadError: message });
    return this.seesError(message);
  }

  async doesNotSeeEmptyState(): Promise<this> {
    await expect(this.page.getByText(/^No (received|sent) requests yet\.$/)).toHaveCount(0);
    return this;
  }

  async isOpen(): Promise<this> {
    await expect(this.page).toHaveURL(/\/inbox$/);
    await expect(this.page.getByRole("heading", { name: "Inbox", level: 1 }).last()).toBeVisible();
    await expect(this.page.getByText("Loading inbox…")).toHaveCount(0);
    return this;
  }

  async tapTab(tab: "Received" | "Sent"): Promise<this> {
    const toggle = this.page.getByRole("button", { name: new RegExp(`^${tab} \\(`) });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await this.page.mouse.move(0, 0);
    return this;
  }

  async accept(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Accept ${name}` }).click();
    return this;
  }

  async decline(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Decline ${name}` }).click();
    return this;
  }

  async goBack(): Promise<SocialRobot> {
    await this.page.getByRole("button", { name: "Back to social" }).click();
    return new SocialRobot(this.page).isOpen();
  }

  async seesNotice(message: string): Promise<this> {
    await expect(this.page.getByText(message)).toBeVisible();
    return this;
  }

  async seesError(message: string): Promise<this> {
    await expect(this.page.getByRole("alert").filter({ hasText: message })).toBeVisible();
    return this;
  }

  async seesStatus(name: string, status: string): Promise<this> {
    await expect(this.row(name)).toContainText(status);
    return this;
  }

  async canAnswer(name: string): Promise<this> {
    await expect(this.page.getByRole("button", { name: `Accept ${name}` })).toBeVisible();
    return this;
  }

  async cannotAnswer(name: string): Promise<this> {
    await expect(this.row(name)).toBeVisible();
    await expect(this.page.getByRole("button", { name: `Accept ${name}` })).toHaveCount(0);
    return this;
  }

  async seesEmptyState(tab: "received" | "sent"): Promise<this> {
    await expect(this.page.getByText(`No ${tab} requests yet.`)).toBeVisible();
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ inbox: FriendsInboxRobot }>({
  inbox: async ({ page }, provide) => {
    await provide(new FriendsInboxRobot(page));
  },
});
