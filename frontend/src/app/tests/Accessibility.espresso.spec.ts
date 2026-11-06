import { expect, type Page } from "@playwright/test";
import { expectAccessible } from "../../testing/a11y";
import { test } from "../../testing/playwright";
import { populatedCourses } from "../../testing/fixtures/courses";
import { halfMoonBayAnalytics } from "../../testing/fixtures/courseAnalytics";
import { golfers, populatedFriendships } from "../../testing/fixtures/friendships";
import { halfMoonBayCourse, ratedHalfMoonBayCourse, ratedHalfMoonBayRound } from "../../testing/fixtures/roundDetails";
import { storedRounds } from "../../testing/fixtures/rounds";
import { AnalyticsRobot } from "../../pages/analytics/tests/AnalyticsPage.robot";
import { LoginRobot } from "../../pages/auth/login/tests/LoginPage.robot";
import { RegisterRobot } from "../../pages/auth/register/tests/RegisterPage.robot";
import { CareerRobot } from "../../pages/career/tests/CareerPage.robot";
import { CourseDetailRobot } from "../../pages/courses/course-details/tests/CourseDetailPage.robot";
import { CoursesRobot } from "../../pages/courses/tests/CoursesPage.robot";
import { DashboardRobot } from "../../pages/dashboard/tests/DashboardPage.robot";
import { LandingRobot } from "../../pages/landing-page/tests/LandingPage.robot";
import { RoundDetailRobot } from "../../pages/rounds/round-details/tests/RoundDetailPage.robot";
import { RoundsRobot } from "../../pages/rounds/tests/RoundsPage.robot";
import { ScanRobot } from "../../pages/scan/tests/ScanPage.robot";
import { SettingsRobot } from "../../pages/settings/tests/SettingsPage.robot";
import { FriendsInboxRobot } from "../../pages/social/inbox/tests/FriendsInboxPage.robot";
import { SocialRobot } from "../../pages/social/tests/SocialPage.robot";
import { TheLabRobot } from "../../pages/the-lab/tests/TheLabPage.robot";

const friends = { friendships: populatedFriendships, golfers };

/**
 * Every screen, loaded the way its own espresso flows load it, run through axe-core (WCAG 2.1
 * A/AA). The rules in `KNOWN_FAILURES` are left out until their fixes land.
 */
const SCREENS: Record<string, (page: Page) => Promise<unknown>> = {
  landing: (page) => new LandingRobot(page).open(),
  "sign in": (page) => new LoginRobot(page).open(),
  "create account": (page) => new RegisterRobot(page).open(),
  dashboard: (page) => new DashboardRobot(page).open(),
  rounds: (page) => new RoundsRobot(page).open(storedRounds),
  "round detail": (page) =>
    new RoundDetailRobot(page).open(ratedHalfMoonBayRound, { fullCourses: [ratedHalfMoonBayCourse] }),
  courses: (page) => new CoursesRobot(page).open(populatedCourses),
  "course detail": (page) =>
    new CourseDetailRobot(page).open(halfMoonBayCourse, { courseAnalytics: halfMoonBayAnalytics }),
  scan: (page) => new ScanRobot(page).open(),
  analytics: (page) => new AnalyticsRobot(page).open(),
  "the lab": (page) => new TheLabRobot(page).open(),
  career: (page) => new CareerRobot(page).open(),
  social: (page) => new SocialRobot(page).open(friends),
  "friends inbox": (page) => new FriendsInboxRobot(page).open(friends),
  settings: (page) => new SettingsRobot(page).open(),
};

for (const [screen, open] of Object.entries(SCREENS)) {
  test(`${screen} has no accessibility violations`, async ({ page }) => {
    await open(page);
    await expectAccessible(page);
  });
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  for (const [screen, open] of Object.entries(SCREENS)) {
    test(`${screen} has no accessibility violations`, async ({ page }) => {
      await open(page);
      await expectAccessible(page);
    });
  }

  test("the scorecard scrolls sideways from the keyboard", async ({ page }) => {
    await SCREENS["round detail"](page);
    const scorecard = page.getByRole("region", { name: "Scorecard" });
    await scorecard.focus();
    await expect(scorecard).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => scorecard.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });
});
