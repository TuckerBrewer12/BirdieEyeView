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
      const contentType = request.headers()["content-type"] ?? "";
      if (contentType.includes("multipart/form-data")) {
        // A scan's photo is multipart; the note rides along as `user_context`.
        const note = multipartField(request.postData(), "user_context");
        body = note === null ? undefined : { user_context: note };
      } else {
        try {
          body = request.postDataJSON();
        } catch {
          body = undefined;
        }
      }
      const reply = await backend.respond(request.method(), request.url(), body);
      await route.fulfill({
        status: reply.status,
        contentType: "application/json",
        body: JSON.stringify(reply.body),
      });
    });
    return backend;
  }
}

/** One text field of a multipart body. The file part is binary, so the field is found by name. */
function multipartField(body: string | null, name: string): string | null {
  if (!body) return null;
  const at = body.lastIndexOf(`name="${name}"`);
  if (at < 0) return null;
  const separator = body.includes("\r\n") ? "\r\n" : "\n";
  const blank = body.indexOf(separator + separator, at);
  if (blank < 0) return null;
  const start = blank + separator.length * 2;
  const end = body.indexOf(separator, start);
  return end < 0 ? body.slice(start) : body.slice(start, end);
}
