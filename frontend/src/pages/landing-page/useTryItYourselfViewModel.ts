import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preparePhotoForUpload } from "@/data/photoUpload";
import { scanRepository, type ScanRepository } from "@/data/scanRepository";
import { useCardText, type PickedPhoto } from "@/data/useCardText";
import { Round } from "@/domain";
import { useExtractScorecard } from "@/data/useExtractScorecard";

/** How many steps the card walks through while a scan is read; the section names them. */
const PHASE_COUNT = 4;

const PHASE_HOLD_MS = 3500;

export interface TryItYourselfViewModel {
  step: "upload" | "processing" | "review";
  /** The picked photo, readied for upload. */
  photo: File | null;
  error: string | null;
  setUserContext: (context: string) => void;
  pickPhoto: (photo: File) => void;
  extract: () => void;
  reset: () => void;

  phase: number;

  /** The scanned card as a round, its figures read the way an unsaved edit's are. */
  round: Round | null;
  hasScores: boolean;
}

export function useTryItYourselfViewModel(
  repository: ScanRepository = scanRepository,
): TryItYourselfViewModel {
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [userContext, setUserContext] = useState("");
  const [phase, setPhase] = useState(0);
  // A later pick wins over an earlier one still being readied.
  const latestPick = useRef(0);
  const extraction = useExtractScorecard(repository);

  const cardText = useCardText(photo, repository);

  const step = extraction.isPending ? "processing" : extraction.data ? "review" : "upload";

  // The scan gives no progress events, so the phases are paced rather than
  // reported. Restarting at zero each time keeps a second scan from opening
  // on its last step.
  useEffect(() => {
    if (step !== "processing") return;
    const timer = setInterval(
      () => setPhase((current) => Math.min(current + 1, PHASE_COUNT - 1)),
      PHASE_HOLD_MS,
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
      void preparePhotoForUpload(picked).then((file) => {
        if (pick === latestPick.current) setPhoto({ id: `${pick}`, file });
      });
    },
    [resetExtraction],
  );

  const extract = useCallback(() => {
    if (!photo) return;
    mutate({ photo: photo.file, userContext, ocrText: cardText });
  }, [photo, userContext, cardText, mutate]);

  const reset = useCallback(() => {
    latestPick.current += 1;
    setPhoto(null);
    setUserContext("");
    resetExtraction();
  }, [resetExtraction]);

  const result = extraction.data;
  const round = useMemo(() => (result ? Round.fromScan(result.round) : null), [result]);

  return {
    step,
    photo: photo?.file ?? null,
    error: extraction.error?.message ?? null,
    setUserContext,
    pickPhoto,
    extract,
    reset,

    phase,

    round,
    hasScores: (round?.holes.length ?? 0) > 0,
  };
}
