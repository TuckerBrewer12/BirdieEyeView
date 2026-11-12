import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand";
import { cn } from "@/brand/cn";

interface SectionCardProps {
  title: string;
  description?: ReactNode;
  /** A control or figure at the header's end. */
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  "data-slot"?: string;
}

/** One of the page's cards: a title, perhaps a line under it and a control beside it, then what it shows. */
export function SectionCard({
  title,
  description,
  action,
  className,
  contentClassName,
  children,
  "data-slot": slot,
}: SectionCardProps) {
  return (
    <Card size="lg" data-slot={slot} className={className}>
      <CardHeader>
        <CardTitle level={2} className="text-body-lg font-semibold">
          {title}
        </CardTitle>
        {description != null && <CardDescription>{description}</CardDescription>}
        {action != null && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-3.5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
