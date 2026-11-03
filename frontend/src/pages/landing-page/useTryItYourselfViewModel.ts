import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preparePhotoForUpload } from "@/data/photoUpload";
import { scanRepository, type ScanRepository } from "@/data/scanRepository";
import { useCardText, type PickedPhoto } from "@/data/useCardText";
import { Round } from "@/domain";
import { useExtractScorecard } from "@/data/useExtractScorecard";

const PHASES = [
  { label: "Reading course details…", detail: "Identifying name, location & tee boxes" },
  { label: "Extracting hole scores…", detail: "Parsing your scorecard row by row" },
  { label: "Verifying yardages & par…", detail: "Cross-checking hole data" },
  { label: "Calculating confidence…", detail: "Flagging fields that may need review" },
] as const;

const PHASE_HOLD_MS = 3500;

export interface TryItYourselfViewModel {
  step: "upload" | "processing" | "review";
  photo: File | null;
  error: string | null;
  setUserContext: (context: string) => void;
  pickPhoto: (photo: File) => void;
  extract: () => void;
  reset: () => void;

  phase: number;
  phaseCount: number;
  phaseLabel: string;
  phaseDetail: string;

  round: Round | null;
  hasScores: boolean;
}

export function useTryItYourselfViewModel(
  repository: ScanRepository = scanRepository,
): TryItYourselfViewModel {
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [userContext, setUserContext] = useState("");
  const [phase, setPhase] = useState(0);
  const latestPick = useRef(0);
  const extraction = useExtractScorecard(repository);

  const cardText = useCardText(photo, repository);

  const step = extraction.isPending ? "processing" : extraction.data ? "review" : "upload";

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setInterval(
      () => setPhase((current) => Math.min(current + 1, PHASES.length - 1)),
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
    phaseCount: PHASES.length,
    phaseLabel: PHASES[phase].label,
    phaseDetail: PHASES[phase].detail,

    round,
    hasScores: (round?.holes.length ?? 0) > 0,
  };
}
