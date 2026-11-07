import { USER_FACING_ERRORS } from "@/lib/userFacingErrors";

/** Holes as a phrase mid-sentence: "hole 3", "holes 3 and 7", "holes 3, 7 and 12". */
export function holeList(holes: readonly number[]): string {
  if (holes.length === 0) return "";
  if (holes.length === 1) return `hole ${holes[0]}`;
  return `holes ${holes.slice(0, -1).join(", ")} and ${holes[holes.length - 1]}`;
}

/** What a failed scan says, beside the photo it failed on. */
export interface ScanFailureNotice {
  title: string;
  /** The server's reason when it gave one (a file too large, a type it can't read), else what to try. */
  detail: string;
}

/** The likeliest fix when the server says only that the card couldn't be read. */
export const SCAN_RETAKE_TIP = "Try a flatter, brighter photo with the whole card in frame.";

/** Words a failed scan's message: "Please try again" says nothing the retry button doesn't. */
export function scanFailureNotice(message: string): ScanFailureNotice {
  return {
    title: "Couldn't read this card",
    detail: message === USER_FACING_ERRORS.scan ? SCAN_RETAKE_TIP : message,
  };
}
