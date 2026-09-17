import { useCallback, useMemo, useState } from "react";
import { applyTheme, getStoredPublicTheme, setStoredPublicTheme, type AppTheme } from "@/lib/theme";

/** Anchors the nav and the hero scroll to. */
export const LANDING_SECTIONS = {
  howItWorks: "how-it-works",
  tryItOut: "try-it-out",
} as const;

export interface LandingNavLink {
  key: string;
  label: string;
  /** Scrolls to the target and closes the mobile menu. */
  select: () => void;
}

export interface LandingLink {
  label: string;
  to: string;
}

export interface LandingAction {
  label: string;
  select: () => void;
}

export interface LandingPageViewModel {
  navOpen: boolean;
  toggleNav: () => void;
  navLinks: LandingNavLink[];
  signIn: LandingLink;
  signUp: LandingLink;
  heroHeadline: string;
  heroHighlight: string;
  heroBody: string;
  heroPrimary: LandingLink;
  heroSecondary: LandingAction;
  isDark: boolean;
  themeToggleLabel: string;
  themeToggleAriaLabel: string;
  toggleTheme: () => void;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function useLandingPageViewModel(): LandingPageViewModel {
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => getStoredPublicTheme());

  const toggleNav = useCallback(() => setNavOpen((open) => !open), []);

  // Desktop and mobile share this, so the menu-closing half cannot drift onto
  // only one of them the way it had before.
  const navigateTo = useCallback((scroll: () => void) => {
    scroll();
    setNavOpen(false);
  }, []);

  const navLinks = useMemo<LandingNavLink[]>(
    () => [
      { key: "overview", label: "Overview", select: () => navigateTo(scrollToTop) },
      {
        key: "try-it-out",
        label: "Try It Out",
        select: () => navigateTo(() => scrollToSection(LANDING_SECTIONS.tryItOut)),
      },
    ],
    [navigateTo],
  );

  const toggleTheme = useCallback(() => {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredPublicTheme(next);
    applyTheme(next);
  }, [theme]);

  return {
    navOpen,
    toggleNav,
    navLinks,
    signIn: { label: "Sign In", to: "/login" },
    signUp: { label: "Sign Up", to: "/register" },
    heroHeadline: "Your Golf History —",
    heroHighlight: "Just Snap a Scorecard.",
    heroBody:
      "Ditch the manual data entry. Take a photo of your paper scorecard and instantly track your fairways, putts, greens in regulation, and handicap.",
    heroPrimary: { label: "Sign Up Free", to: "/register" },
    heroSecondary: {
      label: "See How It Works",
      select: () => scrollToSection(LANDING_SECTIONS.howItWorks),
    },
    isDark: theme === "dark",
    themeToggleLabel: theme === "dark" ? "Light Mode" : "Dark Mode",
    themeToggleAriaLabel: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
    toggleTheme,
  };
}
