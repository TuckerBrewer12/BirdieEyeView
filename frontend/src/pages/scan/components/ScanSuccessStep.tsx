import { CircleCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
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

/** The card is saved: a success alert with its score against par, then the round to open or share. */
export function ScanSuccessStep({ round, onView }: ScanSuccessStepProps) {
  const { cardRef, share, sharing } = useShareRound();

  return (
    <div className="flex justify-center py-8">
      {/* Rendered just off the right edge, so Share can capture it as an image. */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-full">
        <RoundShareCard ref={cardRef} round={round} />
      </div>

      <div data-slot="scan-saved" className="flex w-full max-w-sm flex-col gap-4">
        <Alert tone="success" variant="outline">
          <CircleCheck />
          <AlertTitle>
            <h2>Round saved</h2>
          </AlertTitle>
          <AlertDescription className="flex items-baseline justify-between gap-3">
            <span className="min-w-0">{formatCourseName(round.course?.name)}</span>
            <span className="flex shrink-0 items-baseline gap-1.5">
              <StatValue size="lg">{round.score ?? "—"}</StatValue>
              <ToParFigure toPar={round.toPar} />
            </span>
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button size="lg" className="flex-1" onClick={onView}>
            View round
          </Button>
          <Button size="lg" variant="outline" disabled={sharing} onClick={() => share(roundShareMessage(round))}>
            {sharing ? "Preparing…" : "Share"}
          </Button>
        </div>
      </div>
    </div>
  );
}
