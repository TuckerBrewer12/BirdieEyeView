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
      const multipart = /multipart\/form-data/.test(request.headers()["content-type"] ?? "");
      let body: unknown;
      try {
        body = multipart ? formFields(request.postDataBuffer()) : request.postDataJSON();
      } catch {
        body = undefined;
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

/**
 * A multipart body's text fields by name (`user_context`, `course_id`, …). Files are left out:
 * the fake reads what was said about the card, not the photo.
 */
function formFields(data: Buffer | null): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!data) return fields;
  const text = data.toString("latin1");
  const part = /Content-Disposition: form-data; name="([^"]+)"(; filename="[^"]*")?\r\n(?:[^\r\n]+\r\n)*\r\n([\s\S]*?)\r\n--/g;
  for (const [, name, file, value] of text.matchAll(part)) {
    if (!file) fields[name] = Buffer.from(value, "latin1").toString("utf8");
  }
  return fields;
}
