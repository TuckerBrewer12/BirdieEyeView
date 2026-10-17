# Courses

Route: `/courses`. Access: Signed in.

Searches course records and opens a selected course for inspection and supported edits.

## Entry points

- [CoursesPage.tsx](../../../frontend/src/pages/CoursesPage.tsx)
- [CourseDetailPanel.tsx](../../../frontend/src/components/course-detail/CourseDetailPanel.tsx)

## How it works

The page owns debounced search and the selected course ID. React Query uses the API search/list helpers, and selecting a course delegates detail behavior to the course component. Master versus user-owned course permissions ultimately come from the backend.

## Boundaries and checks when changing it

Keep search identity and displayed names distinct. Check clearing search, delayed results, no matches, returning from detail, and read-only versus editable courses. The page currently keeps its state and requests inline.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
