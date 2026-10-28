import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { preparePhotoForUpload } from "@/data/photoUpload";
import { queryKeys } from "@/data/queryKeys";
import { scanRepository, type ScanRepository } from "@/data/scanRepository";
import { Round } from "@/domain";
import { useExtractScorecard } from "./useExtractScorecard";

const PHASES = [
  { label: "Reading course details…", detail: "Identifying name, location & tee boxes" },
  { label: "Extracting hole scores…", detail: "Parsing your scorecard row by row" },
  { label: "Verifying yardages & par…", detail: "Cross-checking hole data" },
  { label: "Calculating confidence…", detail: "Flagging fields that may need review" },
] as const;

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
  phaseCount: number;
  phaseLabel: string;
  phaseDetail: string;

  /** The scanned card as a round, its figures read the way an unsaved edit's are. */
  round: Round | null;
  hasScores: boolean;
}

export function useTryItYourselfViewModel(
  repository: ScanRepository = scanRepository,
): TryItYourselfViewModel {
  const [photo, setPhoto] = useState<{ id: string; file: File } | null>(null);
  const [userContext, setUserContext] = useState("");
  const [phase, setPhase] = useState(0);
  // A later pick wins over an earlier one still being readied.
  const latestPick = useRef(0);
  const extraction = useExtractScorecard(repository);

  // The card's text is read as soon as the photo is picked, so the scan itself
  // has less to do. It is keyed on the photo, so a new pick never sends an old
  // card's text. Failing is fine: extract reads the card itself.
  const cardText = useQuery({
    queryKey: queryKeys.scanText(photo?.id ?? null),
    queryFn: () => repository.readText(photo!.file),
    enabled: photo != null,
    staleTime: Infinity,
    retry: false,
  });

  const step = extraction.isPending ? "processing" : extraction.data ? "review" : "upload";

  // The scan gives no progress events, so the phases are paced rather than
  // reported. Restarting at zero each time keeps a second scan from opening
  // on "Calculating confidence…".
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
    mutate({ photo: photo.file, userContext, ocrText: cardText.data ?? null });
  }, [photo, userContext, cardText.data, mutate]);

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
