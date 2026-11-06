import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { PickedPhoto } from "@/data/useCardText";
import { todayIso, type ManualSetup, type PickedCourse, type ScanMode, type ScanReviewDraft } from "./scanModel";

/**
 * The scan in progress. A scan takes a minute or two and a review can be long, so this
 * lives above the routes: a golfer can look something up and come back to the same card.
 */
export interface ScanSession {
  mode: ScanMode;
  photo: PickedPhoto | null;
  userContext: string;
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
    userContext: "",
    presetCourse: null,
    setup: { course: null, teeBox: "", date: today },
    review: null,
    savedRoundId: null,
    error: null,
  };
}

/**
 * The session after arriving from another page with a course to scan at (a course's "Scan a
 * round"). A card already under way wins: a photo picked, a card being checked or a round
 * just saved, or a course chosen for typing scores in. Otherwise the golfer lands on the
 * upload step with that course picked ahead.
 */
export function withArrivingCourse(session: ScanSession, course: PickedCourse): ScanSession {
  const underWay =
    session.photo !== null ||
    session.review !== null ||
    session.savedRoundId !== null ||
    (session.mode === "manual" && session.setup.course !== null);
  if (underWay) return session;
  return { ...session, mode: "scan", presetCourse: course, error: null };
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
