/** Holes as a phrase mid-sentence: "hole 3", "holes 3 and 7", "holes 3, 7 and 12". */
export function holeList(holes: readonly number[]): string {
  if (holes.length === 0) return "";
  if (holes.length === 1) return `hole ${holes[0]}`;
  return `holes ${holes.slice(0, -1).join(", ")} and ${holes[holes.length - 1]}`;
}
