# Courses

Route: `/courses` and `/courses/:courseId`. Access: Signed in.

The course list with each course's tees and the golfer's record there, and a course's page: its scorecard, the golfer's record, recent rounds and, once played, My performance.

## Entry points

- [CoursesPage.tsx](../../../frontend/src/pages/courses/CoursesPage.tsx)
- [useCoursesPageViewModel.ts](../../../frontend/src/pages/courses/useCoursesPageViewModel.ts)
- [coursesRepository.ts](../../../frontend/src/pages/courses/coursesRepository.ts)
- [CourseDetailPage.tsx](../../../frontend/src/pages/courses/course-details/CourseDetailPage.tsx)
- [useCourseDetailPageViewModel.ts](../../../frontend/src/pages/courses/course-details/useCourseDetailPageViewModel.ts)

## How it works

The list (`GET /courses`, search with `include_record=true`) carries tee colours longest first and the record's rounds, average and best. The course page reads the course (`course_detail()`) and `GET /api/stats/course-analytics/{user}/{course}`: the record, the score trend, a row a hole and the nine sums. The scorecard is `ScorecardCard` + `ScorecardGrid` off the picked tee; My performance draws `TrendAreaChart`, `HoleProfileChart` and `HoleGreensPuttsChart`.

## Boundaries and checks when changing it

Tee order is the server's. A failed record load shows the error with Retry, not "not played yet". Check an unplayed course, a course with only nines, and a tee without yardages.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
