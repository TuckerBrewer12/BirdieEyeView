import { expect, type Page } from "@playwright/test";

const DARK = /(^|\s)dark(\s|$)/;

/** Every token flips on `dark`, so the class on <html> is the theme the page is drawn in. */
export async function expectTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  const html = page.locator("html");
  if (theme === "dark") await expect(html).toHaveClass(DARK);
  else await expect(html).not.toHaveClass(DARK);
}
