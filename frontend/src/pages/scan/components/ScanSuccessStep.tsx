import { CircleCheck, Loader2, Share2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  HoleScoreBars,
  PageTitle,
  RoundShareCard,
  StatValue,
  ToParPill,
} from "@/brand";
import type { Round } from "@/domain";
import { courseLabel, formatTeeName } from "@/domain/course";
import { formatDayShort } from "@/domain/date";
import { roundShareMessage } from "@/domain/share";
import { useShareRound } from "@/platform/useShareRound";

interface ScanSuccessStepProps {
  /** The round as saved. */
  round: Round;
  onView: () => void;
  onScanAnother: () => void;
}

/** The card is saved: the round as a row of its holes, with it to open, share, or a new card to scan. */
export function ScanSuccessStep({ round, onView, onScanAnother }: ScanSuccessStepProps) {
  const { cardRef, share, sharing } = useShareRound();
  const day = formatDayShort(round.date);
  const tee = round.teeBox ? formatTeeName(round.teeBox) : null;
  const when = day && tee ? `${day} · ${tee}` : (day ?? tee);

  return (
    <div className="flex justify-center md:pt-14">
      {/* Rendered just off the right edge, so Share can capture it as an image. */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-full">
        <RoundShareCard ref={cardRef} round={round} />
      </div>

      <Card data-slot="scan-saved" role="status" className="w-full max-w-110">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <CircleCheck aria-hidden className="size-8 shrink-0 fill-primary stroke-primary-foreground" />
            <PageTitle size="compact">Round saved</PageTitle>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-body-lg font-semibold text-foreground">{courseLabel(round.course?.name)}</p>
                {when && <p className="mt-0.5 text-body-sm text-muted-foreground">{when}</p>}
              </div>
              <div className="flex items-baseline gap-1.5">
                <StatValue size="lg">{round.score ?? "—"}</StatValue>
                <ToParPill toPar={round.toPar} ground="muted" />
              </div>
            </div>
            <div className="flex gap-2">
              <HoleScoreBars holes={round.frontNine.holes} size="sm" className="flex-1" />
              <HoleScoreBars holes={round.backNine.holes} size="sm" className="flex-1" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={onView}>
              View round
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                variant="outline"
                disabled={sharing}
                onClick={() => void share(roundShareMessage(round))}
              >
                {sharing ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Share2 data-icon="inline-start" />
                )}
                {sharing ? "Preparing…" : "Share"}
              </Button>
              <Button size="lg" variant="outline" onClick={onScanAnother}>
                Scan another
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
