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

export interface SignInReturn {
  from: string;
}

export function needsSignIn(pathname: string): boolean {
  return SIGNED_IN_SECTIONS.some((section) => pathname === section || pathname.startsWith(`${section}/`));
}

export function signInReturnFor(location: { pathname: string; search?: string; hash?: string }): SignInReturn {
  return { from: `${location.pathname}${location.search ?? ""}${location.hash ?? ""}` };
}

export function returnPathFrom(state: unknown): string | null {
  if (typeof state !== "object" || state === null || !("from" in state)) return null;
  const from = (state as { from: unknown }).from;
  if (typeof from !== "string" || !from.startsWith("/")) return null;
  if (from.startsWith("//") || from.startsWith("/\\")) return null;
  const pathname = from.split(/[?#]/, 1)[0];
  return needsSignIn(pathname) ? from : null;
}
