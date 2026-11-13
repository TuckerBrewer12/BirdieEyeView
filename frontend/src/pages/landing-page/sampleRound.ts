import { Round, type RoundSummary } from "@/domain/round";

/**
 * The round on the hero's photo, written the way the server sends a round summary, so the page
 * shows it as any saved round is shown and works nothing out itself: 79 (+8) at Half Moon Bay off
 * the blue tees, ten pars and eight bogeys.
 */
const KINDS = ["bogey", "par", "par", "bogey", "bogey", "par", "bogey", "par", "par",
  "par", "bogey", "bogey", "par", "bogey", "par", "par", "bogey", "par"] as const;
const STROKES = [5, 4, 3, 6, 5, 4, 4, 5, 3, 4, 6, 5, 3, 5, 4, 5, 4, 4];

export const SAMPLE_ROUND: RoundSummary = Round.fromSummary({
  id: "sample-round",
  date: null,
  course_id: null,
  course_name: "Half Moon Bay Golf Links",
  tee_box: "blue",
  total_score: 79,
  to_par: 8,
  front_nine: 39,
  back_nine: 40,
  total_putts: 34,
  best_rank: null,
  worst_rank: null,
  score_counts: { eagle: 0, birdie: 0, par: 10, bogey: 8, double: 0, triple: 0, quad: 0 },
  hole_scores: KINDS.map((kind, i) => ({ hole_number: i + 1, strokes: STROKES[i], kind, running_to_par: null })),
});
