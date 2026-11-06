import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

/** WCAG 2.1 A and AA: the level app stores and most accessibility laws point at. */
const WCAG_21_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Rules that fail across the app today, each with why and what fixes it. They are left out so the
 * check can hold every other rule now; delete an entry when its fix lands and the check holds
 * every screen to that rule from then on. Don't add to this list to get a build green: fix the
 * screen instead.
 */
export const KNOWN_FAILURES: Readonly<Record<string, string>> = {
  "color-contrast":
    "muted-foreground on muted surfaces is 4.33-4.49:1 (needs 4.5), and the bogey, birdie and par " +
    "score colours as text or as a fill under white are 2.5-3.8:1. These are token changes that " +
    "move nearly every screenshot, so they get their own PRs.",
  "meta-viewport":
    "index.html sets maximum-scale=1 and user-scalable=no, so a golfer can't pinch to zoom. " +
    "Removing them is a product call for the native shell (iOS zooms into small inputs on focus).",
};

/** One line per broken rule: what it is and where, so a failure reads without opening a trace. */
function describe(violation: Violation): string {
  const where = violation.nodes.map((node) => node.target.join(" ")).join(" | ");
  return `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help} -> ${where}`;
}

/**
 * Runs axe-core over the page as it stands and fails on any WCAG 2.1 A/AA violation, apart from
 * the `KNOWN_FAILURES`. Call it once the screen has loaded what it shows.
 */
export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_21_AA)
    .disableRules(Object.keys(KNOWN_FAILURES))
    .analyze();
  expect(violations.map(describe), "axe-core found accessibility violations").toEqual([]);
}
