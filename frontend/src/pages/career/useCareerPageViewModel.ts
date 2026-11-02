import { useState } from "react";
import { analyticsRepository, type AnalyticsRepository } from "@/data/analyticsRepository";
import { useAnalytics } from "@/data/useAnalytics";
import { messageFrom } from "@/lib/userFacingErrors";
import {
  CAREER_FILTERS,
  careerFrom,
  type Career,
  type CareerWindow,
  type CareerWindowFigures,
  type MilestoneGroup,
} from "./model";

export interface CareerPageViewModel {
  /** Nothing to show yet: the first load. */
  loading: boolean;
  loadError: string | null;
  retry: () => void;
  /** Null until the first load lands. */
  career: Career | null;
  /** Loaded, and the golfer has no rounds yet. */
  showEmpty: boolean;

  /** Every round, or only the last year's, for the records, totals and milestones. */
  timeWindow: CareerWindow;
  setTimeWindow: (timeWindow: CareerWindow) => void;
  /** The records, totals and milestones over the picked window. */
  figures: CareerWindowFigures | null;

  /** The phone's open milestone list. */
  milestoneGroup: MilestoneGroup;
  setMilestoneGroup: (group: MilestoneGroup) => void;
}

/**
 * The career page's screen state. The figures come from the shared analytics query over every
 * round; the server says where the last year starts.
 */
export function useCareerPageViewModel(
  userId: string,
  repository: AnalyticsRepository = analyticsRepository,
): CareerPageViewModel {
  const [timeWindow, setTimeWindow] = useState<CareerWindow>("lifetime");
  const [milestoneGroup, setMilestoneGroup] = useState<MilestoneGroup>("scoring");

  const { data, isPending, isError, error, refetch } = useAnalytics(userId, CAREER_FILTERS, careerFrom, repository);

  const career = data ?? null;
  const loadError = isError ? messageFrom(error, "Could not load your career.") : null;

  return {
    loading: isPending,
    loadError,
    retry: () => void refetch(),
    career,
    showEmpty: career != null && loadError == null && career.roundCount === 0,
    timeWindow,
    setTimeWindow,
    figures: career?.windows[timeWindow] ?? null,
    milestoneGroup,
    setMilestoneGroup,
  };
}
