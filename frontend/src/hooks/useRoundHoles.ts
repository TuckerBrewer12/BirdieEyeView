import { useMemo } from "react";
import { playedHoles, type PlayedHole } from "@/domain/round";
import type { Course, Round } from "@/types/golf";

export type HoleData = PlayedHole;

export function useRoundHoles(round: Round, course?: Course | null): PlayedHole[] {
  return useMemo(() => playedHoles(round, course), [round, course]);
}
