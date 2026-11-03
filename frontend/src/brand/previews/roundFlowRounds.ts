import { Round } from "@/domain";
import { roundResponse } from "@/testing/fakes/roundResponses";
import { storedRounds } from "@/testing/fixtures/rounds";

const [template, , best] = storedRounds;

/** Over par from the first hole, a rough stretch at holes 4 to 7, and a birdie to finish. */
const par = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
const toPar = [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, -1];

export const overPar = Round.fromDto(
  roundResponse({
    ...template,
    hole_scores: template.hole_scores.map((hole, i) => ({
      ...hole,
      par_played: par[i],
      strokes: par[i] + toPar[i],
    })),
  }),
);

/** Under par for most of the round, with one blow-up at the end. */
export const underPar = Round.fromDto(roundResponse(best));
