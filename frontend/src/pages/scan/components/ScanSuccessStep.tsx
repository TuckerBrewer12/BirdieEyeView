import { ArrowRight, CheckCircle2, Loader2, Share2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  PageTitle,
  RoundShareCard,
  Stat,
  StatLabel,
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

/** The card is saved: its score against par, with the round to share or open. */
export function ScanSuccessStep({ round, onView }: ScanSuccessStepProps) {
  const { cardRef, share, sharing } = useShareRound();

  return (
    <div className="flex justify-center py-8">
      {/* Rendered just off the right edge, so Share can capture it as an image. */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-full">
        <RoundShareCard ref={cardRef} round={round} />
      </div>

      <Card data-slot="scan-saved" className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 aria-hidden className="size-12 stroke-icon text-primary" />
            <PageTitle>Round saved!</PageTitle>
            <p className="text-sm text-muted-foreground">{formatCourseName(round.course?.name)}</p>
          </div>

          <Stat align="center">
            <StatLabel>Score</StatLabel>
            <StatValue size="xl">{round.score ?? "—"}</StatValue>
            <ToParFigure toPar={round.toPar} />
          </Stat>

          <div className="flex w-full flex-col gap-2">
            <Button size="lg" disabled={sharing} onClick={() => share(roundShareMessage(round))}>
              {sharing ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Share2 data-icon="inline-start" />
              )}
              {sharing ? "Preparing…" : "Share Round"}
            </Button>
            <Button size="lg" variant="outline" onClick={onView}>
              View Round
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
