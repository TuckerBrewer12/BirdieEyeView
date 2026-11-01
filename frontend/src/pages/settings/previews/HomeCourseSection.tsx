import type { CourseSummary } from "@/types/golf";
import { HomeCourseSection } from "../components/HomeCourseSection";

const course = (id: string, name: string, location: string): CourseSummary => ({
  id,
  name,
  location,
  par: 72,
  total_holes: 18,
  tee_count: 4,
  external_course_id: null,
  source: "local",
});

const results = [
  course("pebble", "Pebble Beach Golf Links", "Pebble Beach, CA"),
  course("spyglass", "Spyglass Hill", "Pebble Beach, CA"),
];

const noop = () => {};

export default function HomeCourseSectionPreview() {
  return (
    <div className="flex flex-col gap-4">
      <HomeCourseSection
        homeCourse={{ id: "pebble", name: "Pebble Beach Golf Links" }}
        query=""
        results={[]}
        searching={false}
        onQueryChange={noop}
        onPick={noop}
        onClear={noop}
      />
      <HomeCourseSection
        homeCourse={null}
        query="peb"
        results={results}
        searching={false}
        onQueryChange={noop}
        onPick={noop}
        onClear={noop}
      />
      <HomeCourseSection
        homeCourse={null}
        query="xyz"
        results={[]}
        searching={false}
        onQueryChange={noop}
        onPick={noop}
        onClear={noop}
      />
    </div>
  );
}
