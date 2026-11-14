import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { PickedPhoto } from "@/data/useCardText";
import { NO_CARD_FACTS, type CardFacts } from "@/domain/scan";
import type { FailedScanAttempt } from "@/domain/scanReport";
import { todayIso, type ManualSetup, type PickedCourse, type ScanMode, type ScanReviewDraft } from "./scanModel";

export interface ScanSession {
  mode: ScanMode;
  photo: PickedPhoto | null;
  card: CardFacts;
  presetCourse: PickedCourse | null;
  setup: ManualSetup;
  review: ScanReviewDraft | null;
  savedRoundId: string | null;
  error: string | null;
  failedScan: FailedScanAttempt | null;
}

export function newScanSession(today: string = todayIso()): ScanSession {
  return {
    mode: "scan",
    photo: null,
    card: NO_CARD_FACTS,
    presetCourse: null,
    setup: { course: null, teeBox: "", date: today },
    review: null,
    savedRoundId: null,
    error: null,
    failedScan: null,
  };
}

export interface ScanSessionStore {
  session: ScanSession;
  setSession: Dispatch<SetStateAction<ScanSession>>;
}

export const ScanSessionContext = createContext<ScanSessionStore | null>(null);

export function useScanSession(): ScanSessionStore {
  const store = useContext(ScanSessionContext);
  if (!store) throw new Error("useScanSession must be used inside ScanSessionProvider");
  return store;
}
