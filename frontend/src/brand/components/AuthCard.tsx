import * as React from "react";
import { cn } from "@/brand/cn";
import { BrandMark } from "./BrandMark";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "./Card";
import { PageTitle } from "./PageTitle";

interface AuthCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

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
