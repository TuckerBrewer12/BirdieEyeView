import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preparePhotoForUpload } from "@/data/photoUpload";
import { scanReportRepository, type ScanReportRepository } from "@/data/scanReportRepository";
import { scanRepository, type ScanRepository } from "@/data/scanRepository";
import { useCardText, type PickedPhoto } from "@/data/useCardText";
import { Round } from "@/domain";
import { useExtractScorecard } from "@/data/useExtractScorecard";
import { useFailedScanReport, type FailedScanReport } from "@/data/useFailedScanReport";
import type { FailedScanAttempt } from "@/domain/scanReport";
import { failedScanAttempt, scanFailureOf } from "@/lib/scanReports";
import { NO_CARD_FACTS, SCAN_STEPS, SCAN_STEP_HOLD_MS, cardContext, scanStepAt, type CardFacts } from "@/domain/scan";

export interface TryItYourselfViewModel {
  step: "upload" | "processing" | "review";
  /** The picked photo, readied for upload. */
  photo: File | null;
  error: string | null;
  /** Sending the failed scan's photo for debugging, when the visitor asks. */
  report: FailedScanReport;
  /** What the golfer says is on the card. */
  card: CardFacts;
  setCard: (patch: Partial<CardFacts>) => void;
  pickPhoto: (photo: File) => void;
  extract: () => void;
  reset: () => void;

  /** The step of reading the card showing, and its words. */
  phase: number;
  phaseLabel: string;

  /** The scanned card as a round, its figures read the way an unsaved edit's are. */
  round: Round | null;
  hasScores: boolean;
}

export function useTryItYourselfViewModel(
  repository: ScanRepository = scanRepository,
  reports: ScanReportRepository = scanReportRepository,
): TryItYourselfViewModel {
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [card, setCardFacts] = useState<CardFacts>(NO_CARD_FACTS);
  const setCard = useCallback(
    (patch: Partial<CardFacts>) => setCardFacts((current) => ({ ...current, ...patch })),
    [],
  );
  const [phase, setPhase] = useState(0);
  // A later pick wins over an earlier one still being readied.
  const latestPick = useRef(0);
  const extraction = useExtractScorecard(repository);
  const [failedScan, setFailedScan] = useState<FailedScanAttempt | null>(null);
  const report = useFailedScanReport(failedScan, reports);

  const cardText = useCardText(photo, repository);

  const step = extraction.isPending ? "processing" : extraction.data ? "review" : "upload";

  // The scan gives no progress events, so the phases are paced rather than
  // reported. Restarting at zero each time keeps a second scan from opening
  // on its last step.
  useEffect(() => {
    if (step !== "processing") return;
    const timer = setInterval(
      () => setPhase((current) => Math.min(current + 1, SCAN_STEPS.length - 1)),
      SCAN_STEP_HOLD_MS,
    );
    return () => {
      clearInterval(timer);
      setPhase(0);
    };
  }, [step]);

  const { reset: resetExtraction, mutate } = extraction;

  const pickPhoto = useCallback(
    (picked: File) => {
      const pick = ++latestPick.current;
      resetExtraction();
      setFailedScan(null);
      void preparePhotoForUpload(picked).then((file) => {
        if (pick === latestPick.current) setPhoto({ id: `${pick}`, file });
      });
    },
    [resetExtraction],
  );

  const extract = useCallback(() => {
    if (!photo) return;
    const pick = latestPick.current;
    setFailedScan(null);
    mutate(
      { photo: photo.file, userContext: cardContext(card), ocrText: cardText },
      {
        onError: (error) => {
          // Only the scan of the photo still picked may be reported.
          if (pick === latestPick.current) setFailedScan(failedScanAttempt(photo.file, scanFailureOf(error)));
        },
      },
    );
  }, [photo, card, cardText, mutate]);

  const reset = useCallback(() => {
    latestPick.current += 1;
    setPhoto(null);
    setCardFacts(NO_CARD_FACTS);
    setFailedScan(null);
    resetExtraction();
  }, [resetExtraction]);

  const result = extraction.data;
  const round = useMemo(() => (result ? Round.fromScan(result.round) : null), [result]);

  return {
    step,
    photo: photo?.file ?? null,
    error: extraction.error?.message ?? null,
    report,
    card,
    setCard,
    pickPhoto,
    extract,
    reset,

    phase,
    phaseLabel: scanStepAt(phase).label,

    round,
    hasScores: (round?.holes.length ?? 0) > 0,
  };
}
