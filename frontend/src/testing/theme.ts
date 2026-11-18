import { expect, type Page } from "@playwright/test";

const DARK = /(^|\s)dark(\s|$)/;

export async function expectTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  const html = page.locator("html");
  if (theme === "dark") await expect(html).toHaveClass(DARK);
  else await expect(html).not.toHaveClass(DARK);
}

/**
 * Turns an open page dark the way a saved dark choice does on load. The looks are all CSS, so a spec
 * captures light, switches and captures dark without loading the page twice.
 */
export async function switchToDark(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await expectTheme(page, "dark");
}
