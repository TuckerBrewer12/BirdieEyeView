import { courseSummaryFrom } from "../../domain/course";
import type { CourseSummaryDto } from "../../types/api";
import { courseSummaryResponse } from "../fakes/courseAnalyticsResponses";
import { pebbleBeachCourse, toCourseSummary } from "./roundDetails";
import { storedRounds } from "./rounds";

/** Pebble Beach as the server lists it. */
export const pebbleBeach = toCourseSummary(pebbleBeachCourse);
/** Pebble Beach as a repository hands it to a page: a search result to pick. */
export const pebbleBeachSummary = courseSummaryFrom(pebbleBeach);
export const searchableCourses = [pebbleBeach];

/** The course list: two courses the golfer has played, with their record there, and one they haven't. */
export const populatedCourses: CourseSummaryDto[] = [
  {
    id: "course-hmb",
    name: "Half Moon Bay",
    location: "Half Moon Bay, CA",
    par: 72,
    total_holes: 18,
    tee_count: 4,
    tees: ["Blue", "White", "Gold", "Red"],
    external_course_id: null,
    source: "local" as const,
  },
  {
    id: "course-blue-rock",
    name: "Blue Rock",
    location: "South Yarmouth, MA",
    par: 72,
    total_holes: 18,
    tee_count: 3,
    tees: ["Blue", "White", "Red"],
    external_course_id: null,
    source: "local" as const,
  },
  {
    id: "course-pebble",
    name: "Pebble Beach",
    location: "Pebble Beach, CA",
    par: 72,
    total_holes: 18,
    tee_count: 5,
    tees: ["Black", "Blue", "White", "Gold", "Red"],
    external_course_id: null,
    source: "local" as const,
  },
].map((course) => courseSummaryResponse(course, storedRounds));
