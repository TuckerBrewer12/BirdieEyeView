import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand";
import { cn } from "@/brand/cn";

interface SectionCardProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  "data-slot"?: string;
}

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
