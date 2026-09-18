import { useMemo } from "react";
import type { Round } from "@/types/golf";

export interface HoleData {
  hole: number;
  strokes: number;
  par: number;
  toPar: number;
  putts: number | null;
  gir: boolean | null;
  fairway: boolean | null;
}

export function useRoundHoles(round: Round): HoleData[] {
  return useMemo(() => {
    return round.hole_scores
      .filter(s => s.hole_number != null && s.strokes != null)
      .map(s => {
        const courseHole = round.course?.holes.find(h => h.number === s.hole_number);
        const par = courseHole?.par ?? s.par_played ?? 4;
        return {
          hole: s.hole_number!,
          strokes: s.strokes!,
          par,
          toPar: s.strokes! - par,
          putts: s.putts,
          gir: s.green_in_regulation,
          fairway: s.fairway_hit,
        };
      })
      .sort((a, b) => a.hole - b.hole);
  }, [round]);
}
