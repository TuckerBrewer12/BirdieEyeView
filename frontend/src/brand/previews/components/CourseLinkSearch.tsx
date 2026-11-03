import type { ReactNode } from "react";
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

const idle = {
  searching: false,
  onQueryChange: () => {},
  onSelectCourse: () => {},
  onClose: () => {},
  autoFocus: false,
};

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <p className="text-label font-semibold text-muted-foreground">{label}</p>
      {children}
    </section>
  );
}

export default function CourseLinkSearchPreview() {
  return (
    <>
      <Group label="CourseLinkSearch · searching">
        <CourseLinkSearch
          {...idle}
          autoFocus
          title="Link to a course"
          description="Adds par, yardage and handicap data to this round."
          query="peb"
          results={[pebble, spyglass]}
        />
      </Group>
      <Group label="No match">
        <CourseLinkSearch
          {...idle}
          query="Half Moon"
          results={[]}
          reviewVariant
          onUseCustomName={() => {}}
          onAddCourse={() => {}}
        />
      </Group>
      <Group label="Linked / custom name">
        <CourseLinkSearch
          {...idle}
          query=""
          results={[]}
          linkedName="Pebble Beach Golf Links"
          linkedLocation="Pebble Beach, CA"
          onClear={() => {}}
        />
        <CourseLinkSearch
          {...idle}
          query=""
          results={[]}
          customName="Muni Tuesday"
          onClear={() => {}}
        />
      </Group>
    </>
  );
}
