import { CircleCheck, Loader2, Share2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  PageTitle,
  RoundPreview,
  RoundShareCard,
} from "@/brand";
import type { Round } from "@/domain";
import { roundShareMessage } from "@/domain/share";
import { useShareRound } from "@/platform/useShareRound";

const SAVED_NOT_SHOWN = "It's in your rounds, but it couldn't be shown here.";

interface ScanSuccessStepProps {
  round: Round | null;
  onView: () => void;
  onScanAnother: () => void;
}

export function ScanSuccessStep({ round, onView, onScanAnother }: ScanSuccessStepProps) {
  const { cardRef, share, sharing } = useShareRound();

  return (
    <div className="flex justify-center md:pt-14">
      {round && (
        <div aria-hidden className="pointer-events-none fixed top-0 left-full">
          <RoundShareCard ref={cardRef} round={round} />
        </div>
      )}

      <Card data-slot="scan-saved" role="status" className="w-full max-w-110">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <CircleCheck aria-hidden className="size-8 shrink-0 fill-primary stroke-primary-foreground" />
            <PageTitle size="compact">Round saved</PageTitle>
          </div>

          {round ? (
            <RoundPreview round={round} variant="summary" />
          ) : (
            <p className="text-body text-muted-foreground">{SAVED_NOT_SHOWN}</p>
          )}

          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={onView}>
              View round
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {round && (
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
              )}
              <Button size="lg" variant="outline" className={round ? undefined : "col-span-2"} onClick={onScanAnother}>
                Scan another
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
