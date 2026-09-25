import { Menu, Moon, Sun, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BrandMark,
  Button,
  Collapsible,
  CollapsibleClose,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/brand";
import { usePublicTheme } from "@/lib/usePublicTheme";
import { LANDING_SECTIONS, scrollToLandingSection, scrollToTop } from "../sections";

const NAV_LINKS = [
  { key: "overview", label: "Overview", scroll: scrollToTop },
  {
    key: "try-it-out",
    label: "Try It Out",
    scroll: () => scrollToLandingSection(LANDING_SECTIONS.tryItOut),
  },
];

export function PublicNav() {
  const theme = usePublicTheme();
  const themeToggleLabel = theme.isDark ? "Light Mode" : "Dark Mode";

  return (
    <Collapsible
      render={<nav />}
      className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" aria-label="BirdieEyeView home">
          <BrandMark />
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV_LINKS.map((link) => (
            <Button key={link.key} variant="linkMuted" size="sm" onClick={link.scroll}>
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
            onClick={theme.toggle}
            aria-label={`Switch to ${themeToggleLabel}`}
          >
            {theme.isDark ? <Sun /> : <Moon />}
          </Button>
        </div>

        <CollapsibleTrigger
          render={<Button variant="ghost" size="icon" className="md:hidden" />}
          aria-label="Toggle menu"
        >
          <Menu className="in-data-panel-open:hidden" />
          <X className="hidden in-data-panel-open:block" />
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="flex flex-col gap-4 border-t border-border bg-card px-6 py-4 md:hidden">
        {NAV_LINKS.map((link) => (
          <CollapsibleClose
            key={link.key}
            render={<Button variant="linkMuted" size="sm" className="justify-start" />}
            onClick={link.scroll}
          >
            {link.label}
          </CollapsibleClose>
        ))}
        <div className="flex flex-col gap-2 border-t border-border pt-2">
          <Button variant="outline" shape="pill" onClick={theme.toggle}>
            {themeToggleLabel}
          </Button>
          <Button variant="outline" shape="pill" render={<Link to="/login" />}>
            Sign In
          </Button>
          <Button shape="pill" render={<Link to="/register" />}>
            Sign Up
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
