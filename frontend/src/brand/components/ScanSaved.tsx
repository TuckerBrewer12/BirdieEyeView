import { Check } from "lucide-react";
import { cn } from "@/brand/cn";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { Button } from "./Button";

interface ScanSavedProps {
  /** Where the round was played, already formatted for display. */
  course: string;
  score: number | null;
  toPar: number | null;
  onView: () => void;
  onShare: () => void;
  /** The share image is being prepared. */
  sharing?: boolean;
  className?: string;
}

/** The round is saved: its score against par, with the round to open or share. */
function ScanSaved({ course, score, toPar, onView, onShare, sharing = false, className }: ScanSavedProps) {
  return (
    <div
      data-slot="scan-saved"
      role="status"
      className={cn("flex flex-col gap-2.5 rounded-xl border border-border bg-card p-5", className)}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-success-base text-status-success-on-base"
        >
          <Check className="size-4 stroke-3" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground">Round saved</p>
          <p className="text-body text-muted-foreground">{course}</p>
        </div>
        <div className="ml-auto flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tracking-stat text-foreground">{score ?? "—"}</span>
          <ToParFigure toPar={toPar} />
        </div>
      </div>
      <div className="mt-auto flex gap-2">
        <Button className="h-10 flex-1 rounded-card font-semibold" onClick={onView}>
          View round
        </Button>
        <Button
          variant="outline"
          className="h-10 rounded-card border-input bg-card px-3.5 font-semibold"
          disabled={sharing}
          onClick={onShare}
        >
          {sharing ? "Preparing…" : "Share"}
        </Button>
      </div>
    </div>
  );
}

export { ScanSaved };
