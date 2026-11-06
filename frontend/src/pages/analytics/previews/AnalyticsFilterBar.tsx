import { useState } from "react";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { playedCourseFrom } from "../analyticsRepository";
import { AnalyticsFilterBar } from "../components/AnalyticsFilterBar";
import { DEFAULT_FILTERS, type AnalyticsFilters } from "../model";

const courses = sampleGolfer.playedCourses.map(playedCourseFrom);

export default function AnalyticsFilterBarPreview() {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  return (
    <>
      <AnalyticsFilterBar filters={filters} onChange={setFilters} playedCourses={courses} hasHomeCourse />
      {/* Narrowed to one course this year: the clear button shows. */}
      <AnalyticsFilterBar
        filters={{ limit: 20, timeframe: "ytd", courseId: courses[0].id }}
        onChange={() => {}}
        playedCourses={courses}
        hasHomeCourse={false}
      />
    </>
  );
}
