import { Menu, Moon, Sun, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BrandMark,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/brand";
import { useTheme } from "@/context/theme";

export function PublicNav() {
  const { toggle: toggleTheme } = useTheme();

  return (
    <Collapsible
      render={<nav />}
      className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" aria-label="BirdieEyeView home">
          <BrandMark />
        </Link>

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
            aria-label="Toggle dark mode"
          >
            <Moon className="dark:hidden" />
            <Sun className="hidden dark:block" />
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

      <CollapsibleContent className="flex flex-col gap-2 border-t border-border bg-card px-6 py-4 md:hidden">
        <Button variant="outline" shape="pill" onClick={toggleTheme}>
          <span className="dark:hidden">Dark Mode</span>
          <span className="hidden dark:inline">Light Mode</span>
        </Button>
        <Button variant="outline" shape="pill" render={<Link to="/login" />}>
          Sign In
        </Button>
        <Button shape="pill" render={<Link to="/register" />}>
          Sign Up
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
