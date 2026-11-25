import { useId } from "react";
import { Link } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { Button, Card, CardDescription, CardHeader, CardTitle, IconBadge } from "@/brand";
import { cn } from "@/brand/cn";
import { FIRST_ROUND } from "../present";

interface FirstRoundCardProps {
  compact?: boolean;
  className?: string;
}

export function FirstRoundCard({ compact = false, className }: FirstRoundCardProps) {
  const titleId = useId();
  return (
    <Card
      data-slot="first-round-card"
      render={<section aria-labelledby={titleId} />}
      corner={compact ? "lead-phone" : "lead"}
      className={cn(compact ? "gap-4 px-5 py-6" : "flex-row items-center gap-6 px-8 py-7", className)}
    >
      <IconBadge icon={ScanLine} tone="primary" className={compact ? "size-10" : "size-12"} />
      <CardHeader className="min-w-0 flex-1 gap-1.5 px-0">
        <CardTitle id={titleId} level={2} className={compact ? "text-lg font-semibold" : "text-name"}>
          {FIRST_ROUND.title}
        </CardTitle>
        <CardDescription className="text-body text-foreground-secondary">{FIRST_ROUND.detail}</CardDescription>
      </CardHeader>
      <Button size="lg" className={compact ? "w-full" : "shrink-0"} render={<Link to="/scan" />}>
        {FIRST_ROUND.action}
      </Button>
    </Card>
  );
}
