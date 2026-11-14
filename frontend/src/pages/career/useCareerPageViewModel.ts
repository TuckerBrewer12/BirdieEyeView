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
  loading: boolean;
  loadError: string | null;
  retry: () => void;
  career: Career | null;
  showEmpty: boolean;

  timeWindow: CareerWindow;
  setTimeWindow: (timeWindow: CareerWindow) => void;
  figures: CareerWindowFigures | null;

  milestoneGroup: MilestoneGroup;
  setMilestoneGroup: (group: MilestoneGroup) => void;
}

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
