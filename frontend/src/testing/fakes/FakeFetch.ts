import { vi } from "vitest";
import type { FakeBackend } from "./FakeBackend";

/** Points the real `api` client at a FakeBackend. */
export class FakeFetch {
  static install(backend: FakeBackend): void {
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method =
        init?.method ??
        (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET") ??
        "GET";
      let body: unknown;
      if (typeof init?.body === "string") {
        try {
          body = JSON.parse(init.body);
        } catch {
          body = undefined;
        }
      }
      const reply = backend.handle(method, url, body);
      return Promise.resolve(
        new Response(JSON.stringify(reply.body), {
          status: reply.status,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
  }
}
