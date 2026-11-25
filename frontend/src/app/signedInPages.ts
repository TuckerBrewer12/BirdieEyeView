import { lazy, useEffect, type ComponentType } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { matchPath } from "react-router-dom";
import { hasSessionToken } from "@/lib/sessionToken";
import { AnalyticsPage as AnalyticsNow } from "@/pages/analytics";
import { CareerPage as CareerNow } from "@/pages/career";
import { CourseDetailPage as CourseDetailNow, CoursesPage as CoursesNow } from "@/pages/courses";
import { DashboardPage as DashboardNow } from "@/pages/dashboard";
import { RoundDetailPage as RoundDetailNow, RoundsPage as RoundsNow } from "@/pages/rounds";
import { ScanPage as ScanNow } from "@/pages/scan";
import { SettingsPage as SettingsNow } from "@/pages/settings";
import { FriendsInboxPage as FriendsInboxNow, SocialPage as SocialNow } from "@/pages/social";

type Page = ComponentType<{ userId: string }>;
type PageModule = { default: Page };

const loaders: Array<{ path: string; load: () => Promise<Page> }> = [];

const RELOADED_AT_KEY = "signed-in-page-reload";
const RELOAD_COOLDOWN_MS = 60_000;

function claimReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0);
    if (Date.now() - last <= RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

function reloadOnceForNewDeploy(error: unknown): Promise<never> {
  if (!claimReload()) return Promise.reject(error);
  window.location.reload();
  return new Promise<never>(() => undefined);
}

function resolvedSynchronously(page: Page): Promise<PageModule> {
  const thenable = { then: (resolve: (module: PageModule) => void) => resolve({ default: page }) };
  return thenable as unknown as Promise<PageModule>;
}

function onDemand(path: string, load: () => Promise<Page>): Page {
  let loaded: Page | undefined;
  const fetchPage = () =>
    load().then((page) => {
      loaded = page;
      return page;
    });
  loaders.push({ path, load: fetchPage });
  return lazy(() => {
    if (loaded) return resolvedSynchronously(loaded);
    return fetchPage().then((page) => ({ default: page }), reloadOnceForNewDeploy);
  });
}

export const DashboardPage: Page = import.meta.env.DEV
  ? DashboardNow
  : onDemand("/", () => import("@/pages/dashboard/DashboardPage").then((m) => m.DashboardPage));
export const RoundsPage: Page = import.meta.env.DEV
  ? RoundsNow
  : onDemand("/rounds", () => import("@/pages/rounds/RoundsPage").then((m) => m.RoundsPage));
export const RoundDetailPage: Page = import.meta.env.DEV
  ? RoundDetailNow
  : onDemand("/rounds/:roundId", () =>
      import("@/pages/rounds/round-details/RoundDetailPage").then((m) => m.RoundDetailPage),
    );
export const CoursesPage: Page = import.meta.env.DEV
  ? CoursesNow
  : onDemand("/courses", () => import("@/pages/courses/CoursesPage").then((m) => m.CoursesPage));
export const CourseDetailPage: Page = import.meta.env.DEV
  ? CourseDetailNow
  : onDemand("/courses/:courseId", () =>
      import("@/pages/courses/course-details/CourseDetailPage").then((m) => m.CourseDetailPage),
    );
export const ScanPage: Page = import.meta.env.DEV
  ? ScanNow
  : onDemand("/scan", () => import("@/pages/scan/ScanPage").then((m) => m.ScanPage));
export const AnalyticsPage: Page = import.meta.env.DEV
  ? AnalyticsNow
  : onDemand("/analytics", () => import("@/pages/analytics/AnalyticsPage").then((m) => m.AnalyticsPage));
export const CareerPage: Page = import.meta.env.DEV
  ? CareerNow
  : onDemand("/career", () => import("@/pages/career/CareerPage").then((m) => m.CareerPage));
export const SettingsPage: Page = import.meta.env.DEV
  ? SettingsNow
  : onDemand("/settings", () => import("@/pages/settings/SettingsPage").then((m) => m.SettingsPage));
export const SocialPage: Page = import.meta.env.DEV
  ? SocialNow
  : onDemand("/social", () => import("@/pages/social/SocialPage").then((m) => m.SocialPage));
export const FriendsInboxPage: Page = import.meta.env.DEV
  ? FriendsInboxNow
  : onDemand("/inbox", () => import("@/pages/social/inbox/FriendsInboxPage").then((m) => m.FriendsInboxPage));

if (!import.meta.env.DEV && hasSessionToken()) {
  const opened = loaders.find(({ path }) => matchPath(path, window.location.pathname));
  void opened?.load().catch(() => undefined);
}

let preloaded = false;

function preloadAll() {
  preloaded = true;
  for (const { load } of loaders) void load().catch(() => undefined);
}

const SETTLE_MS = 1000;

function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback !== "function") {
    const id = window.setTimeout(run, 0);
    return () => window.clearTimeout(id);
  }
  const id = window.requestIdleCallback(run, { timeout: 3000 });
  return () => window.cancelIdleCallback(id);
}

export function PreloadSignedInPages(): null {
  const fetching = useIsFetching();
  useEffect(() => {
    if (loaders.length === 0 || preloaded || fetching > 0) return;
    let cancelIdle = () => {};
    const settle = window.setTimeout(() => {
      cancelIdle = whenIdle(preloadAll);
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(settle);
      cancelIdle();
    };
  }, [fetching]);
  return null;
}
