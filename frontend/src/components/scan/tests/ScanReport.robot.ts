import { expect, type Page, type TestInfo } from "@playwright/test";
import { FakeScanBackend } from "@/testing/fakes/FakeScanBackend";

const scorecard = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="180">
  <rect width="400" height="180" fill="white"/>
  <text x="20" y="35" font-size="20">Test Scorecard</text>
  <path d="M20 55H380M20 95H380M20 135H380M20 55V135M140 55V135M260 55V135M380 55V135" stroke="black"/>
  <text x="35" y="83" font-size="18">Hole 1</text><text x="160" y="83" font-size="18">Hole 2</text>
  <text x="285" y="83" font-size="18">Hole 3</text><text x="35" y="122" font-size="18">?</text>
</svg>`;

export class ScanReportRobot {
  readonly backend = new FakeScanBackend();
  private page: Page;
  private signedIn = false;

  constructor(page: Page) { this.page = page; }

  async open(signedIn: boolean, dark: boolean) {
    this.signedIn = signedIn;
    await this.backend.install(this.page, signedIn);
    await this.page.addInitScript((mode) => {
      localStorage.setItem("settings_theme", mode);
      localStorage.setItem("public_theme", mode);
    }, dark ? "dark" : "light");
    await this.page.goto(signedIn ? "/scan" : "/");
    await expect(this.page.locator("input[type=file]").first()).toBeAttached();
    await expect(this.page.getByRole("button", { name: "Report failed scan" })).toHaveCount(0);
  }

  async failScan() {
    await this.page.locator("input[type=file]").first().setInputFiles({
      name: "private-name.svg", mimeType: "image/svg+xml", buffer: Buffer.from(scorecard),
    });
    await this.page.getByRole("button", { name: this.signedIn ? "Extract Scorecard" : "Scan My Scorecard" }).click();
    await expect(this.page.getByRole("button", { name: "Report failed scan" })).toBeVisible();
  }

  async report() { await this.page.getByRole("button", { name: "Report failed scan" }).click(); }

  async seesUnavailable() {
    await expect(this.page.getByRole("status").filter({ hasText: "Reporting isn't available yet" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Report sent" })).toHaveCount(0);
    expect(this.backend.reports.size).toBe(0);
  }

  async seesSending() {
    await expect(this.page.getByRole("button", { name: "Sending report…" })).toBeDisabled();
  }

  async seesSentAnonymously() {
    await expect(this.page.getByRole("button", { name: "Report sent" })).toBeDisabled();
    expect(this.backend.reports.size).toBe(1);
    const payload = [...this.backend.reports.values()][0];
    expect(payload).not.toContain("private-name");
    expect(payload).not.toContain("private-user");
    expect(payload).toContain('"category":"unreadable_scores"');
    for (const headers of this.backend.reportHeaders) {
      expect(headers.authorization).toBeUndefined();
      expect(headers.cookie).toBeUndefined();
      expect(headers.referer).toBeUndefined();
    }
  }

  async capture(name: string, info: TestInfo) {
    const report = this.page.getByRole("group", { name: "Scan report" });
    await report.scrollIntoViewIfNeeded();
    await this.page.evaluate(() => document.fonts.ready);
    const path = info.outputPath(`${name}.png`);
    await report.screenshot({ path });
    await info.attach(name, { path, contentType: "image/png" });
  }
}
