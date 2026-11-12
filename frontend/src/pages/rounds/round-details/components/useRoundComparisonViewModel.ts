import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { roundsRepository, type RoundsRepository } from "../../roundsRepository";
import {
  COMPARISON_WINDOWS,
  comparisonFrom,
  type ComparisonRow,
  type ComparisonWindow,
} from "../roundDetailModel";

export interface RoundComparisonViewModel {
  /** False until the comparison loads, and when there is none. */
  show: boolean;
  window: ComparisonWindow;
  windows: readonly { value: ComparisonWindow; label: string }[];
  /** The window's figures; empty when no round came before this one. */
  rows: ComparisonRow[];
  /** The segmented control's pick. Tapping the pressed window again keeps it. */
  pickWindow: (value: string | undefined) => void;
}

/** This round against the golfer's average over the rounds before it, one window at a time. */
export function useRoundComparisonViewModel(
  userId: string,
  roundId: string,
  repository: RoundsRepository = roundsRepository,
): RoundComparisonViewModel {
  const [window, setWindow] = useState<ComparisonWindow>("l20");
  const { data: comparison } = useQuery({
    queryKey: queryKeys.roundComparison(userId, roundId),
    queryFn: () => repository.getRoundComparison(userId, roundId),
  });
  const windows = useMemo(() => (comparison ? comparisonFrom(comparison) : {}), [comparison]);

  const pickWindow = useCallback((value: string | undefined) => {
    const picked = COMPARISON_WINDOWS.find((option) => option.value === value);
    if (picked) setWindow(picked.value);
  }, []);

  return {
    show: comparison != null,
    window,
    windows: COMPARISON_WINDOWS,
    rows: windows[window]?.rows ?? [],
    pickWindow,
  };
}
