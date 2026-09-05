import { expect, type Page } from "@playwright/test";

/** Screen robot for isolated brand-kit stories. */
export class BrandKitRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async open(story: string): Promise<this> {
    await this.page.route("**/api/**", async (route) => {
      await route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
    });
    await this.page.goto(`/__brand__/${story}`);
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByTestId("brand-stage")).toBeVisible();
    return this;
  }

  async capture(name: string): Promise<this> {
    await expect(this.page.getByTestId("brand-stage")).toHaveScreenshot(name);
    return this;
  }
}

export async function onBrandKit(
  page: Page,
  run: (kit: BrandKitRobot) => Promise<void>,
): Promise<void> {
  await run(new BrandKitRobot(page));
}
