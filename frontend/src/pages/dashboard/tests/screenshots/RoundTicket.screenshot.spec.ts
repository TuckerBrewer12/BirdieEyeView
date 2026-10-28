import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("RoundTicket", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RoundTicket", "round-ticket.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RoundTicket", "round-ticket-dark.png");
  });
});
