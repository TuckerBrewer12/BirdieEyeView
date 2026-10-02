import { test } from "@playwright/test";
import { ScanReportRobot } from "./ScanReport.robot";

// Attach each state for visual review; these are not baseline comparisons.
for (const signedIn of [false, true]) {
  for (const dark of [false, true]) {
    test(`${signedIn ? "signed-in" : "public"} report ${dark ? "dark" : "light"}`, async ({ page }, info) => {
      const scan = new ScanReportRobot(page);
      await scan.open(signedIn, dark);
      await scan.failScan();
      await scan.capture("failed-scan", info);
      await scan.report();
      await scan.seesUnavailable();
      await scan.capture("report-unavailable", info);

      scan.backend.storageAvailable = true;
      scan.backend.holdReports = true;
      await scan.report();
      await scan.seesSending();
      await scan.capture("report-sending", info);
      scan.backend.release();
      await scan.seesSentAnonymously();
      await scan.capture("report-sent", info);
    });
  }
}
