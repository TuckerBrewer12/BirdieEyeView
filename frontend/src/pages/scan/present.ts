export function holeList(holes: readonly number[]): string {
  if (holes.length === 0) return "";
  if (holes.length === 1) return `hole ${holes[0]}`;
  return `holes ${holes.slice(0, -1).join(", ")} and ${holes[holes.length - 1]}`;
}

export function ringedBelow(holes: readonly number[]): string {
  const list = holeList(holes);
  if (!list) return "";
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} ${holes.length === 1 ? "is" : "are"} ringed below.`;
}

const SCAN_FAILED = "Couldn't read this card.";

export function scanFailure(error: string): { title: string; detail: string } {
  const detail = error.startsWith(SCAN_FAILED) ? error.slice(SCAN_FAILED.length).trim() : error;
  return { title: SCAN_FAILED, detail };
}
