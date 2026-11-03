import { Round, scoreKind, type RoundSummary } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, evenPar, best, unlinked] = populatedRounds.map(Round.fromSummary);


/** A fixture round re-scored hole by hole to the canvas board's card. */
function asOnBoard(round: RoundSummary, par: number[], toPar: number[]): RoundSummary {
  const holes = par.map((p, i) => ({ ...round.holes[i], hole: i + 1, strokes: p + toPar[i], kind: scoreKind(p + toPar[i], p) }));
  const total = (from: number, to: number) => holes.slice(from, to).reduce((sum, h) => sum + (h.strokes ?? 0), 0);
  return {
    ...round,
    holes,
    frontNine: { ...round.frontNine, total: total(0, 9) },
    backNine: { ...round.backNine, total: total(9, 18) },
  };
}

const halfMoonBay = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
const blueRock = [4, 4, 4, 5, 4, 4, 3, 4, 5, 4, 4, 3, 4, 4, 3, 4, 5, 4];

/** The rounds the RoundPreview boards draw: Jun 15 (+6), May 2 (E), Apr 18 (−3), Mar 9 unlinked (+13). */
export const boardRounds = {
  overPar: asOnBoard(overPar, halfMoonBay, [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, -1]),
  evenPar: asOnBoard(evenPar, halfMoonBay, Array(18).fill(0)),
  best: asOnBoard(best, blueRock, [0, -1, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, 0, 0, 1]),
  unlinked: asOnBoard(unlinked, halfMoonBay, [2, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0]),
};
