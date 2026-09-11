import { pebbleBeachCourse, toCourseSummary } from "./roundDetails";

export { toCourseSummary };

export const pebbleBeach = toCourseSummary(pebbleBeachCourse);
export const searchableCourses = [pebbleBeach];
