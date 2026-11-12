import type { HoleStats } from "../../domain/courseAnalytics";

const PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];
/** A home course over a dozen rounds: a couple of birdie holes, a few that bite, the rest near par. */
const TO_PAR = [0.3, 0.6, -0.1, 0.2, 1.1, 0.4, 0.8, 0.2, -0.3, 0.5, 0.9, 0.1, 0.0, 1.4, 0.6, 0.3, 0.7, -0.2];
const SPREAD = [0.6, 0.8, 0.5, 0.9, 1.2, 0.7, 1.0, 0.6, 0.8, 0.7, 1.1, 0.5, 0.9, 1.3, 0.8, 0.6, 0.9, 0.7];
const GREENS = [58, 42, 67, 33, 25, 50, 33, 58, 50, 42, 25, 67, 42, 17, 33, 50, 42, 58];
const PUTTS = [1.9, 2.1, 1.8, 2.0, 2.3, 2.0, 2.2, 1.9, 1.7, 2.0, 2.2, 1.8, 1.9, 2.4, 2.1, 2.0, 2.1, 1.8];

/** Each hole's figures as the course page reads them. */
export const homeCourseHoles: HoleStats[] = PARS.map((par, i) => {
  const toPar = TO_PAR[i] ?? 0;
  const birdie = Math.max(0, Math.round((0.3 - toPar) * 25));
  const bogey = Math.min(70, Math.round(25 + toPar * 30));
  const double = toPar > 0.6 ? 15 : 5;
  return {
    hole: i + 1,
    par,
    rounds: 12,
    averageScore: par + toPar,
    averageToPar: toPar,
    spread: SPREAD[i] ?? null,
    greens: GREENS[i] ?? null,
    putts: PUTTS[i] ?? null,
    mix: { eagle: 0, birdie, par: Math.max(0, 100 - birdie - bogey - double), bogey, double, triple: 0, quad: 0 },
  };
});

/** The same holes, highest average to par first, as the course page orders them. */
export const homeCourseHolesHardestFirst: HoleStats[] = [...homeCourseHoles].sort(
  (a, b) => b.averageToPar - a.averageToPar || a.hole - b.hole,
);
