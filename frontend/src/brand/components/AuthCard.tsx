import * as React from "react";
import { cn } from "@/brand/cn";
import { BrandMark } from "./BrandMark";
import { Card, CardContent, CardDescription, CardHeader } from "./Card";
import { PageTitle } from "./PageTitle";

interface AuthCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The page's heading. It renders as the h1, so it names the screen. */
  title: React.ReactNode;
  /** A line under the title, only where the screen needs one: "We'll email you a reset link." */
  description?: string;
  /** The way to the neighbouring screen, under the card: "New here? Create an account". */
  footer?: React.ReactElement;
  children: React.ReactNode;
}

/**
 * The frame every signed-out screen sits in: the brand mark, a card with the title and the form,
 * and the way to the neighbouring screen under it, in a 380px column near the top of the page.
 *
 * On a computer the card rests on the page's grey with the mark centred over it. On a phone the
 * page is the card's white, the card's edges and padding fall away, and the mark sits at the
 * left, so the form reads as the screen itself. Pass `className` to change the outer frame when it
 * sits inside something else, as the kit preview does.
 */
function AuthCard({ title, description, footer, children, className, ...props }: AuthCardProps) {
  return (
    <div
      data-slot="auth-card"
      className={cn(
        "flex min-h-svh w-full flex-col items-center bg-card px-5 pt-18 pb-10 md:bg-background md:pt-24 md:pb-12",
        className,
      )}
      {...props}
    >
      <div className="flex w-full max-w-95 flex-col gap-6">
        <BrandMark size="sm" className="md:self-center" />
        <Card className="gap-4 max-md:rounded-none max-md:bg-transparent max-md:shadow-none max-md:[--card-spacing:0] md:[--card-spacing:--spacing(7)]">
          <CardHeader className="gap-1">
            <PageTitle size="compact">{title}</PageTitle>
            {description && <CardDescription className="text-sm">{description}</CardDescription>}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>
        {footer && (
          <div data-slot="auth-card-footer" className="flex flex-col items-center gap-1 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export { AuthCard };
export type { AuthCardProps };
