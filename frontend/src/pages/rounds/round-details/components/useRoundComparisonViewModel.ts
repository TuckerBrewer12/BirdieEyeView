import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { roundsRepository, type RoundsRepository } from "../../roundsRepository";
import { COMPARISON_WINDOWS, type ComparisonWindow } from "../roundDetailModel";

/** The comparison as the server sent it, or null while it loads and when there is none. */
type RoundComparison = Awaited<ReturnType<RoundsRepository["getRoundComparison"]>>;

export interface RoundComparisonViewModel {
  /** False until the comparison loads, and when there is none. */
  show: boolean;
  window: ComparisonWindow;
  windows: readonly { value: ComparisonWindow; label: string }[];
  /** The comparison as the server sent it. The section words each window. */
  comparison: RoundComparison;
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

  const pickWindow = useCallback((value: string | undefined) => {
    const picked = COMPARISON_WINDOWS.find((option) => option.value === value);
    if (picked) setWindow(picked.value);
  }, []);

  return {
    show: comparison != null,
    window,
    windows: COMPARISON_WINDOWS,
    comparison: comparison ?? null,
    pickWindow,
  };
}
