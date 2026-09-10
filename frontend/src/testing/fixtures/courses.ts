import type { CourseSummary } from "../../types/golf";

export const pebbleBeach: CourseSummary = {
  id: "course-pebble",
  name: "Pebble Beach",
  location: "Pebble Beach, CA",
  par: 72,
  total_holes: 18,
  tee_count: 4,
};

export const searchableCourses: CourseSummary[] = [pebbleBeach];
