import * as React from "react";
import { cn } from "@/brand/cn";
import { BrandMark } from "./BrandMark";

interface AuthSplitLayoutProps {
  /** The rail's display line. Decoration, not the page heading — the form owns the h1. */
  headline: React.ReactNode;
  body: string;
  /** Under the body on the rail — Register's feature list, for one. */
  aside?: React.ReactNode;
  /** The one line under the logo on a phone, where the rail is hidden. */
  mobileSubtitle: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * The two-column frame every signed-out form sits in: a tinted rail with the
 * mark and a line of copy, then the form.
 *
 * Login, Register, ForgotPassword, ResetPassword and VerifyPending each built
 * this by hand, down to their own copy of the logo. Below 48rem the rail drops
 * away and the mark moves above the form instead.
 *
 * The breakpoint is a container query, not a viewport one. On the page the two
 * are the same width, so nothing changes there; in a narrow slot — the kit
 * harness, a sheet — the layout follows the slot rather than the window.
 */
function AuthSplitLayout({
  headline,
  body,
  aside,
  mobileSubtitle,
  children,
  className,
}: AuthSplitLayoutProps) {
  return (
    <div data-slot="auth-split-layout" className={cn("@container", className)}>
      <div className="grid min-h-screen @3xl:grid-cols-2">
        <div className="hidden flex-col justify-between border-r border-border bg-gradient-to-b from-accent to-background p-12 @3xl:flex">
          <div>
            <BrandMark />
            <div className="mt-16">
              <p className="text-4xl leading-tight font-extrabold tracking-display text-foreground">
                {headline}
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{body}</p>
              {aside}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">© 2026 BirdieEyeView</div>
        </div>

        <div className="flex min-h-screen items-center justify-center bg-card px-6 py-12 @3xl:min-h-0">
          <div className="w-full max-w-md">
            <div className="mb-8 @3xl:hidden">
              <BrandMark />
              <p className="mt-1 text-sm text-muted-foreground">{mobileSubtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export { AuthSplitLayout };
