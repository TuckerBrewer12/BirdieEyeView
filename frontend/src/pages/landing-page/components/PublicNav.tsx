import { useCallback, useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark, Button } from "@/brand";
import { applyTheme, getStoredPublicTheme, setStoredPublicTheme, type AppTheme } from "@/lib/theme";
import { LANDING_SECTIONS, scrollToLandingSection, scrollToTop } from "../sections";

const NAV_LINKS = [
  { key: "overview", label: "Overview", section: "top" as const },
  { key: "try-it-out", label: "Try It Out", section: LANDING_SECTIONS.tryItOut },
];

export function PublicNav() {
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => getStoredPublicTheme());

  const closeAndScroll = useCallback((scroll: () => void) => {
    scroll();
    setNavOpen(false);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredPublicTheme(next);
    applyTheme(next);
  }, [theme]);

  const isDark = theme === "dark";
  const themeToggleLabel = isDark ? "Light Mode" : "Dark Mode";

  const linkSelect = (section: "top" | string) => () =>
    closeAndScroll(section === "top" ? scrollToTop : () => scrollToLandingSection(section));

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" aria-label="BirdieEyeView home">
          <BrandMark />
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV_LINKS.map((link) => (
            <Button key={link.key} variant="linkMuted" size="sm" onClick={linkSelect(link.section)}>
              {link.label}
            </Button>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="outline" shape="pill" render={<Link to="/login" />}>
            Sign In
          </Button>
          <Button shape="pill" render={<Link to="/register" />}>
            Sign Up
          </Button>
          <Button
            variant="outline"
            size="icon"
            shape="pill"
            onClick={toggleTheme}
            aria-label={`Switch to ${themeToggleLabel}`}
          >
            {isDark ? <Sun /> : <Moon />}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setNavOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={navOpen}
        >
          {navOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {navOpen && (
        <div className="flex flex-col gap-4 border-t border-border bg-card px-6 py-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <Button
              key={link.key}
              variant="linkMuted"
              size="sm"
              className="justify-start"
              onClick={linkSelect(link.section)}
            >
              {link.label}
            </Button>
          ))}
          <div className="flex flex-col gap-2 border-t border-border pt-2">
            <Button variant="outline" shape="pill" onClick={toggleTheme}>
              {themeToggleLabel}
            </Button>
            <Button variant="outline" shape="pill" render={<Link to="/login" />}>
              Sign In
            </Button>
            <Button shape="pill" render={<Link to="/register" />}>
              Sign Up
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
