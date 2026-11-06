import { CourseLinkSearch } from "@/brand/components/CourseLinkSearch";
import type { CourseSummary } from "@/domain/course";

const pebble: CourseSummary = {
  id: "pebble",
  name: "Pebble Beach Golf Links",
  location: "Pebble Beach, CA",
  par: 72,
  holeCount: 18,
  teeCount: 4,
  source: "local",
  externalId: null,
};

const spyglass: CourseSummary = {
  id: "spyglass",
  name: "Spyglass Hill",
  location: "Pebble Beach, CA",
  par: 72,
  holeCount: 18,
  teeCount: 3,
  source: "local",
  externalId: null,
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
      />
      <CourseLinkSearch
        title="Link to a saved course"
        query="xyz"
        results={[]}
        searching={false}
        onQueryChange={() => {}}
        onSelectCourse={() => {}}
        onClose={() => {}}
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
      />
      <CourseLinkSearch
        query=""
        results={[]}
        searching={false}
        onQueryChange={() => {}}
        onSelectCourse={() => {}}
        onClose={() => {}}
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
        customName="Muni Tuesday"
        onClear={() => {}}
      />
    </>
  );
}
