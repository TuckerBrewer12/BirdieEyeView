import specs from "./specs.js";
import { tester } from "./tester.js";

const spec = (body) => `test("state", async ({ landing, rounds }) => {\n${body}\n});`;

tester.run("specs/capture-after-sees", specs.rules["capture-after-sees"], {
  valid: [
    spec(`await landing.open();\nawait landing.seesHeadline("Scan your scorecard.");\nawait landing.capture("landing.png");`),
    spec(`await rounds.openFailed();\nawait rounds.doesNotSeeEmptyState();\nawait rounds.capture("rounds-error.png");`),
    // Not a capture: other robot calls need no wait.
    spec(`await landing.open();\nawait landing.openMenu();`),
  ],
  invalid: [
    {
      // Landing "mobile nav menu open": the menu is still sliding in.
      code: spec(`await landing.open();\nawait landing.openMenu();\nawait landing.capture("landing-menu-open.png");`),
      errors: [{ messageId: "noWait" }],
    },
    {
      // The wait is there, but not on the line before the shot.
      code: spec(
        `await rounds.open([]);\nawait rounds.seesEmptyState();\nawait rounds.dark();\nawait rounds.capture("rounds-empty.png");`,
      ),
      errors: [{ messageId: "noWait" }],
    },
    {
      // A wait on a different robot does not cover this one.
      code: spec(`await landing.seesHeadline("x");\nawait rounds.capture("rounds.png");`),
      errors: [{ messageId: "noWait" }],
    },
    {
      // A raw expect is not the robot's wait.
      code: spec(`await expect(page.getByText("x")).toBeVisible();\nawait rounds.capture("rounds.png");`),
      errors: [{ messageId: "noWait" }],
    },
    {
      // A sees… call that isn't awaited is not a wait.
      code: spec(`rounds.seesEmptyState();\nawait rounds.capture("rounds.png");`),
      errors: [{ messageId: "noWait" }],
    },
    { code: spec(`await rounds.capture("rounds.png");`), errors: [{ messageId: "noWait" }] },
  ],
});

const robot = (body) => `class SettingsRobot {\n  async capture(name: string) {\n    ${body}\n    return this;\n  }\n}`;

tester.run("specs/full-page-capture", specs.rules["full-page-capture"], {
  valid: [
    robot("await expect(this.page).toHaveScreenshot(name, { fullPage: true });"),
    'test("x", async ({ page }) => { await expect(page).toHaveScreenshot("x.png"); });',
    robot("await expect.soft(this.page).toHaveScreenshot(name);"),
    // Not a screenshot assertion.
    robot("await expect(this.themeControl()).toBeVisible();"),
  ],
  invalid: [
    {
      // SettingsPage.robot.ts: only the theme control is in the shot.
      code: robot("await expect(this.themeControl()).toHaveScreenshot(name);"),
      errors: [{ messageId: "element" }],
    },
    {
      code: robot('await expect(this.page.getByTestId("card")).toHaveScreenshot(name);'),
      errors: [{ messageId: "element" }],
    },
    { code: robot("await expect.soft(locator).not.toHaveScreenshot(name);"), errors: [{ messageId: "element" }] },
  ],
});
