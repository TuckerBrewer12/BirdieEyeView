/** Holes as a phrase mid-sentence: "hole 3", "holes 3 and 7", "holes 3, 7 and 12". */
export function holeList(holes: readonly number[]): string {
  if (holes.length === 0) return "";
  if (holes.length === 1) return `hole ${holes[0]}`;
  return `holes ${holes.slice(0, -1).join(", ")} and ${holes[holes.length - 1]}`;
}

/** Where the scores to check are, as a sentence: "Holes 4 and 11 are ringed below." */
export function ringedBelow(holes: readonly number[]): string {
  const list = holeList(holes);
  if (!list) return "";
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} ${holes.length === 1 ? "is" : "are"} ringed below.`;
}

const SCAN_FAILED = "Couldn't read this card.";

/**
 * A failed read in two parts: the bold "Couldn't read this card." and what to do or what went wrong.
 * The fallback already opens with the title, so it isn't said twice.
 */
export function scanFailure(error: string): { title: string; detail: string } {
  const detail = error.startsWith(SCAN_FAILED) ? error.slice(SCAN_FAILED.length).trim() : error;
  return { title: SCAN_FAILED, detail };
}
