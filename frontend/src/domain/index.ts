export {
  SCORE_KINDS,
  isThreePutt,
  playedScoreKinds,
  scoreKind,
  scoreKindCountLabel,
  strokesToPar,
  toParLabel,
} from "./score";
export type { ScoreKind, ScoreMix } from "./score";

export {
  GOAL_OPTIONS,
  GOAL_BENCHMARK,
  HANDICAP_BENCHMARK,
  COMPARISON_HANDICAPS,
  TOUR_SHORT_GAME,
  goalScoreToBreak,
  goalTargetLabel,
  nearestGoalBenchmark,
} from "./benchmark";
export type { ComparisonTargetValue } from "./benchmark";

export {
  buildRadarData,
  benchmarkProfileFrom,
  profileAverageToPar,
  profilePuttsPerGir,
} from "./radar";
export type { RadarEntry } from "./radar";

export { getTee, teeColors } from "./course";

export {
  ratedCourseHandicap,
  netScore,
  formatHandicapIndex,
  formatCourseHandicap,
} from "./handicap";

export { Round } from "./round";
export type {
  CourseEdit,
  HoleEdits,
  HoleScore,
  HoleSummary,
  Nine,
  RoundDetail,
  RoundEdits,
  RoundSummary,
} from "./round";

export { trendPointsFrom } from "./trend";
export type { RoundTrendPoint } from "./trend";

export { strokesToCheck } from "./scan";
