import * as React from "react";
import { cn } from "@/brand/cn";
import { BrandMark } from "./BrandMark";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "./Card";
import { PageTitle } from "./PageTitle";

interface AuthCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The page's heading. It renders as the h1, so it names the screen. */
  title: React.ReactNode;
  /** One line under the title saying what this screen is for. */
  description?: React.ReactNode;
  /** The way out under the form: "Don't have an account? Create one". */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The frame every signed-out screen sits in: the brand mark, then one card
 * centred on the page with a title, a line of description, the form, and a
 * footer link to the neighbouring screen.
 *
 * Sign in, register, both password screens and both verify screens each laid
 * this out by hand, down to their own copy of the logo, so it lives here once.
 * The card fills the screen's height and centres itself; pass `className` to
 * change that when it sits inside something else, as the kit preview does.
 */
function AuthCard({ title, description, footer, children, className, ...props }: AuthCardProps) {
  return (
    <div
      data-slot="auth-card"
      className={cn(
        "flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-background px-4 py-12",
        className,
      )}
      {...props}
    >
      <BrandMark />
      <Card className="w-full max-w-md gap-6 [--card-spacing:--spacing(6)]">
        <CardHeader>
          <PageTitle size="compact">{title}</PageTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">{children}</CardContent>
        {footer && (
          <CardFooter className="flex-col justify-center gap-1 text-center text-muted-foreground">
            {footer}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export { AuthCard };
export type { AuthCardProps };
