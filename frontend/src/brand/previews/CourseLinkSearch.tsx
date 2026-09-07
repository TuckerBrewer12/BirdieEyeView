import { CourseLinkSearch } from "@/brand/components/CourseLinkSearch";
import type { CourseSummary } from "@/types/golf";

const pebble: CourseSummary = {
  id: "pebble",
  name: "Pebble Beach Golf Links",
  location: "Pebble Beach, CA",
  par: 72,
  total_holes: 18,
  tee_count: 4,
};

const spyglass: CourseSummary = {
  id: "spyglass",
  name: "Spyglass Hill",
  location: "Pebble Beach, CA",
  par: 72,
  total_holes: 18,
  tee_count: 3,
};

export default function CourseLinkSearchPreview() {
  return (
    <>
      <CourseLinkSearch
        title="Link this round to a saved course"
        query="peb"
        results={[pebble, spyglass]}
        searching={false}
        onQueryChange={() => {}}
        onSelectCourse={() => {}}
        onClose={() => {}}
        autoFocus={false}
      />
      <CourseLinkSearch
        title="Link to a saved course"
        query="xyz"
        results={[]}
        searching={false}
        onQueryChange={() => {}}
        onSelectCourse={() => {}}
        onClose={() => {}}
        autoFocus={false}
      />
      <CourseLinkSearch
        query="Half Moon"
        results={[]}
        searching={false}
        reviewVariant
        onUseCustomName={() => {}}
        onQueryChange={() => {}}
        onSelectCourse={() => {}}
        onClose={() => {}}
        autoFocus={false}
      />
      <CourseLinkSearch
        query=""
        results={[]}
        searching={false}
        onQueryChange={() => {}}
        onSelectCourse={() => {}}
        onClose={() => {}}
        autoFocus={false}
        linkedName="Pebble Beach Golf Links"
        onClear={() => {}}
      />
      <CourseLinkSearch
        query=""
        results={[]}
        searching={false}
        onQueryChange={() => {}}
        onSelectCourse={() => {}}
        onClose={() => {}}
        autoFocus={false}
        customName="Muni Tuesday"
        onClear={() => {}}
      />
    </>
  );
}
