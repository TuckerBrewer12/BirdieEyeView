import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { PickedPhoto } from "@/data/useCardText";
import { todayIso, type ManualSetup, type PickedCourse, type ScanMode, type ScanReviewDraft } from "./scanModel";

export interface ScanSession {
  mode: ScanMode;
  photo: PickedPhoto | null;
  userContext: string;
  presetCourse: PickedCourse | null;
  setup: ManualSetup;
  review: ScanReviewDraft | null;
  savedRoundId: string | null;
  error: string | null;
}

export function newScanSession(today: string = todayIso()): ScanSession {
  return {
    mode: "scan",
    photo: null,
    userContext: "",
    presetCourse: null,
    setup: { course: null, teeBox: "", date: today },
    review: null,
    savedRoundId: null,
    error: null,
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
