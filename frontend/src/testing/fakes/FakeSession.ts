import type { Page } from "@playwright/test";
import { FakeBackend, type FakeBackendSeed } from "./FakeBackend";

/** Points Playwright's `/api/**` routes at a FakeBackend. */
export class FakeSession {
  static async install(
    page: Page,
    seed: FakeBackendSeed | FakeBackend,
  ): Promise<FakeBackend> {
    const backend = seed instanceof FakeBackend ? seed : new FakeBackend(seed);
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      let body: unknown;
      try {
        body = request.postDataJSON();
      } catch {
        body = undefined;
      }
      const reply = backend.handle(request.method(), request.url(), body);
      await route.fulfill({
        status: reply.status,
        contentType: "application/json",
        body: JSON.stringify(reply.body),
      });
    });
    return backend;
  }
}
