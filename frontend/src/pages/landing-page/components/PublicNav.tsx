import { Menu, Moon, Sun, X } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark, Button } from "@/brand";
import type { LandingPageViewModel } from "../useLandingPageViewModel";

interface PublicNavProps {
  viewModel: LandingPageViewModel;
}

export function PublicNav({ viewModel }: PublicNavProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" aria-label="BirdieEyeView home">
          <BrandMark />
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          {viewModel.navLinks.map((link) => (
            <Button key={link.key} variant="linkMuted" size="sm" onClick={link.select}>
              {link.label}
            </Button>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="outline" shape="pill" render={<Link to={viewModel.signIn.to} />}>
            {viewModel.signIn.label}
          </Button>
          <Button shape="pill" render={<Link to={viewModel.signUp.to} />}>
            {viewModel.signUp.label}
          </Button>
          <Button
            variant="outline"
            size="icon"
            shape="pill"
            onClick={viewModel.toggleTheme}
            aria-label={`Switch to ${viewModel.themeToggleLabel}`}
          >
            {viewModel.isDark ? <Sun /> : <Moon />}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={viewModel.toggleNav}
          aria-label="Toggle menu"
          aria-expanded={viewModel.navOpen}
        >
          {viewModel.navOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {viewModel.navOpen && (
        <div className="flex flex-col gap-4 border-t border-border bg-card px-6 py-4 md:hidden">
          {viewModel.navLinks.map((link) => (
            <Button
              key={link.key}
              variant="linkMuted"
              size="sm"
              className="justify-start"
              onClick={link.select}
            >
              {link.label}
            </Button>
          ))}
          <div className="flex flex-col gap-2 border-t border-border pt-2">
            <Button variant="outline" shape="pill" onClick={viewModel.toggleTheme}>
              {viewModel.themeToggleLabel}
            </Button>
            <Button variant="outline" shape="pill" render={<Link to={viewModel.signIn.to} />}>
              {viewModel.signIn.label}
            </Button>
            <Button shape="pill" render={<Link to={viewModel.signUp.to} />}>
              {viewModel.signUp.label}
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
