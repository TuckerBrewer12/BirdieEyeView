import { expect, type Page } from "@playwright/test";

export class BrandKitRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async open(story: string): Promise<this> {
    await this.page.goto(`/__brand__/${story}`);
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByTestId("brand-stage")).toBeVisible();
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page.getByTestId("brand-stage")).toHaveScreenshot(name);
    return this;
  }

  async openFrame(story: string): Promise<this> {
    await this.page.goto(`/__brand__/${story}`);
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByTestId("brand-frame")).toBeVisible();
    return this;
  }

  async captureFrame(name: string): Promise<this> {
    await expect(this.page).toHaveScreenshot(name);
    return this;
  }

  async tap(name: string): Promise<this> {
    await this.page.getByRole("button", { name, exact: true }).first().click();
    return this;
  }

  async hover(text: string): Promise<this> {
    await this.page.getByText(text, { exact: true }).first().hover();
    return this;
  }

  async sees(selector: string): Promise<this> {
    await expect(this.page.locator(selector).first()).toBeVisible();
    return this;
  }
}
