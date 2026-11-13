import { Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark, Button } from "@/brand";
import { useTheme } from "@/context/theme";

/**
 * The signed-out header: the brand, then Sign in and Sign up. A phone keeps Sign in alone, in
 * green, since the hero's "or sign up free" sits right under it. The theme toggle stays beside them.
 */
export function PublicNav() {
  const { toggle: toggleTheme } = useTheme();

  return (
    <header className="mx-auto flex max-w-276 items-center justify-between px-5 pt-13 pb-3 md:px-6 md:py-5">
      <Link to="/" aria-label="BirdieEyeView home">
        <BrandMark size="sm" />
      </Link>

      <nav className="flex items-center gap-1 md:gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle dark mode">
          <Moon className="dark:hidden" />
          <Sun className="hidden dark:block" />
        </Button>
        <Button variant="ghost" className="max-md:text-primary" render={<Link to="/login" />}>
          Sign in
        </Button>
        <Button className="max-md:hidden" render={<Link to="/register" />}>
          Sign up
        </Button>
      </nav>
    </header>
  );
}
