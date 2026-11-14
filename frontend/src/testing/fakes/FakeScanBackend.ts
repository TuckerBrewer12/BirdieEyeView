import type { Page, Route } from "@playwright/test";

/** Stateful HTTP boundary for scan/report browser tests; no live OCR or database. */
export class FakeScanBackend {
  readonly reports = new Map<string, string>();
  readonly reportHeaders: Record<string, string>[] = [];
  storageAvailable = false;
  holdReports = false;
  private releaseReport: (() => void) | null = null;

  async install(page: Page, signedIn: boolean) {
    await page.addInitScript(() => {
      localStorage.setItem("bev_access_token", "private-test-token");
    });
    await page.context().addCookies([{ name: "session", value: "private-cookie", url: "http://127.0.0.1:5174" }]);
    await page.route("**/api/**", (route) => this.respond(route, signedIn));
  }

  release() { this.releaseReport?.(); this.releaseReport = null; }

  private async respond(route: Route, signedIn: boolean) {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const reply = (status: number, body: unknown) => route.fulfill({ status, json: body });
    if (path === "/api/auth/me") {
      return signedIn
        ? reply(200, { user_id: "private-user", name: "Test Golfer", email: "private@example.com", email_verified: true })
        : reply(401, { detail: "Not signed in" });
    }
    if (path === "/api/scan/ocr") return reply(200, { ocr_text: "Unreadable scorecard" });
    if (path === "/api/scan/extract") return reply(422, {
      detail: "Unable to clearly read the score rows from this image.",
      failure: { category: "unreadable_scores", stage: "parse" },
    });
    if (path === "/api/scan/reports") {
      this.reportHeaders.push(await request.allHeaders());
      const body = request.postData() ?? "";
      const key = /"retry_key":"([^"]+)"/.exec(body)?.[1];
      if (!key) return reply(422, { detail: "Invalid report metadata" });
      if (this.holdReports) await new Promise<void>((resolve) => { this.releaseReport = resolve; });
      if (!this.storageAvailable) return reply(503, { code: "report_storage_unavailable" });
      this.reports.set(key, body);
      return reply(200, { status: "saved" });
    }
    if (path.includes("/friends")) return reply(200, []);
    return reply(200, {});
  }
}
