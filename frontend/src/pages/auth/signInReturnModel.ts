/**
 * Where a golfer goes back to once they sign in.
 *
 * Signed out, a link to one of the app's pages (a round someone sent, a bookmark, a tab left
 * open until the session ran out) used to land on the marketing page and forget where it was
 * going. Now it goes to sign in, carrying the page along, and signing in opens that page.
 */

/** The app's sections behind sign-in, and the pages under them. Home ("/") isn't one: signed out, it's the landing page. */
export const SIGNED_IN_SECTIONS = [
  "/rounds",
  "/courses",
  "/scan",
  "/analytics",
  "/the-lab",
  "/career",
  "/social",
  "/inbox",
  "/settings",
] as const;

/** What the sign-in screen is handed: the page, with its query and hash, to open after. */
export interface SignInReturn {
  from: string;
}

/** Whether `pathname` is one of the app's pages, so a signed-out visit should ask to sign in. */
export function needsSignIn(pathname: string): boolean {
  return SIGNED_IN_SECTIONS.some(
    (section) => pathname === section || pathname.startsWith(`${section}/`),
  );
}

/** The return trip for a signed-out visit to `location`. */
export function signInReturnFor(location: {
  pathname: string;
  search?: string;
  hash?: string;
}): SignInReturn {
  return { from: `${location.pathname}${location.search ?? ""}${location.hash ?? ""}` };
}

/**
 * The page to open after signing in, read from router state, or null for home.
 *
 * Router state can be anything, so only a same-site path to one of the app's pages counts:
 * never another origin ("//host", "/\host") and never an auth screen.
 */
export function returnPathFrom(state: unknown): string | null {
  if (typeof state !== "object" || state === null || !("from" in state)) return null;
  const from = (state as { from: unknown }).from;
  if (typeof from !== "string" || !from.startsWith("/")) return null;
  if (from.startsWith("//") || from.startsWith("/\\")) return null;
  const pathname = from.split(/[?#]/, 1)[0];
  return needsSignIn(pathname) ? from : null;
}
