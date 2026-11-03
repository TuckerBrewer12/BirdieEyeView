import { Check } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  PageTitle,
  RoundShareCard,
  StatValue,
  ToParFigure,
} from "@/brand";
import type { Round } from "@/domain";
import { formatCourseName } from "@/domain/course";
import { roundShareMessage } from "@/domain/share";
import { useShareRound } from "@/platform/useShareRound";

interface ScanSuccessStepProps {
  /** The round as saved. */
  round: Round;
  onView: () => void;
}

/** The card is saved: its score against par, with the round to open or share. */
export function ScanSuccessStep({ round, onView }: ScanSuccessStepProps) {
  const { cardRef, share, sharing } = useShareRound();

  return (
    <div className="flex justify-center py-8">
      {/* Rendered just off the right edge, so Share can capture it as an image. */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-full">
        <RoundShareCard ref={cardRef} round={round} />
      </div>

      <Card data-slot="scan-saved" className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-success-base text-status-success-on-base"
            >
              <Check className="size-4 stroke-icon-active" />
            </span>
            <div className="min-w-0 flex-1">
              <PageTitle size="compact" className="pt-0">Round saved</PageTitle>
              <p className="text-body text-muted-foreground">{formatCourseName(round.course?.name)}</p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <StatValue size="lg">{round.score ?? "—"}</StatValue>
              <ToParFigure toPar={round.toPar} className="rounded-full bg-muted px-2 py-0.5 font-bold" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="lg" className="flex-1" onClick={onView}>
              View round
            </Button>
            <Button size="lg" variant="outline" disabled={sharing} onClick={() => share(roundShareMessage(round))}>
              {sharing ? "Preparing…" : "Share"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
