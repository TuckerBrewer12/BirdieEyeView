import { courseSummaryFrom } from "../../domain/course";
import type { CourseSummaryDto } from "../../types/api";
import { pebbleBeachCourse, toCourseSummary } from "./roundDetails";

/** Pebble Beach as the server lists it. */
export const pebbleBeach = toCourseSummary(pebbleBeachCourse);
/** Pebble Beach as a repository hands it to a page: a search result to pick. */
export const pebbleBeachSummary = courseSummaryFrom(pebbleBeach);
export const searchableCourses = [pebbleBeach];

export const populatedCourses: CourseSummaryDto[] = [
  {
    id: "course-hmb",
    name: "Half Moon Bay",
    location: "Half Moon Bay, CA",
    par: 72,
    total_holes: 18,
    tee_count: 4,
    external_course_id: null,
    source: "local",
  },
  {
    id: "course-blue-rock",
    name: "Blue Rock",
    location: "South Yarmouth, MA",
    par: 72,
    total_holes: 18,
    tee_count: 3,
    external_course_id: null,
    source: "local",
  },
  {
    id: "course-pebble",
    name: "Pebble Beach",
    location: "Pebble Beach, CA",
    par: 72,
    total_holes: 18,
    tee_count: 5,
    external_course_id: null,
    source: "local",
  },
];
