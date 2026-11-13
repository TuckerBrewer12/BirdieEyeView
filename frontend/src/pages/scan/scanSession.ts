import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { PickedPhoto } from "@/data/useCardText";
import { NO_CARD_FACTS, todayIso, type CardFacts, type ManualSetup, type PickedCourse, type ScanMode, type ScanReviewDraft } from "./scanModel";

/**
 * The scan in progress. A scan takes a minute or two and a review can be long, so this
 * lives above the routes: a golfer can look something up and come back to the same card.
 */
export interface ScanSession {
  mode: ScanMode;
  photo: PickedPhoto | null;
  /** What the golfer says is on the card. */
  card: CardFacts;
  /** A course picked before scanning, so the card is read against it. */
  presetCourse: PickedCourse | null;
  setup: ManualSetup;
  review: ScanReviewDraft | null;
  savedRoundId: string | null;
  /**
   * Why the last scan or course pick failed. Kept here rather than read off the mutation,
   * because a scan can fail after the golfer has left the page and come back.
   */
  error: string | null;
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
