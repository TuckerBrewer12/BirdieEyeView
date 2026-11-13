import type { CourseSummary } from "@/domain/course";
import { HomeCourseSheet } from "../components/HomeCourseSheet";

const course = (id: string, name: string, location: string): CourseSummary => ({
  id,
  name,
  location,
  par: 72,
  holeCount: 18,
  teeCount: 4,
  tees: [],
  record: null,
  source: "local",
  externalId: null,
});

const results = [
  course("pebble", "Pebble Beach Golf Links", "Pebble Beach, CA"),
  course("spyglass", "Spyglass Hill", "Pebble Beach, CA"),
];

const noop = () => {};

export default function HomeCourseSheetPreview() {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-preview overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        <HomeCourseSheet
          open
          contained
          onClose={noop}
          homeCourse={{ id: "pebble", name: "Pebble Beach Golf Links" }}
          query=""
          results={[]}
          searching={false}
          onQueryChange={noop}
          onPick={noop}
          onClear={noop}
        />
      </div>
      <div className="relative h-preview overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        <HomeCourseSheet
          open
          contained
          onClose={noop}
          homeCourse={null}
          query="peb"
          results={results}
          searching={false}
          onQueryChange={noop}
          onPick={noop}
          onClear={noop}
        />
      </div>
    </div>
  );
}
