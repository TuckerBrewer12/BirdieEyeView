import { ArrowRight, Camera } from "lucide-react";
import { Card, CardContent } from "./Card";

interface ScanActionCardProps {
  onClick?: () => void;
}

export function ScanActionCard({ onClick }: ScanActionCardProps) {
  return (
    <Card
      data-slot="scan-action-card"
      size="sm"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={onClick ? "group cursor-pointer hover:shadow-card" : undefined}
    >
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Camera className="size-5 text-muted-foreground transition-colors group-hover:text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold leading-tight text-card-foreground">Scan a round</div>
              <div className="mt-0.5 text-label font-semibold uppercase tracking-kicker text-muted-foreground transition-colors group-hover:text-primary">
                Upload scorecard
              </div>
            </div>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
            <ArrowRight className="size-4 -rotate-45 text-muted-foreground transition-transform group-hover:rotate-0 group-hover:text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
