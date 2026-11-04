import { useState } from "react";
import { FilterChip, FilterChipGroup } from "@/brand/components/FilterChip";

const courses = [
  { name: "Half Moon Bay", count: 2 },
  { name: "Blue Rock", count: 1 },
  { name: "Pebble Beach", count: 1 },
];

/** The board's chip states, then a group that picks one course or none, as the Rounds page's does. */
export default function FilterChipPreview() {
  const [course, setCourse] = useState("Blue Rock");

  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-5 overflow-auto bg-background p-6">
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">Chip · off, selected, no count</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip count={2}>Half Moon Bay</FilterChip>
          <FilterChip count={1} defaultPressed>
            Blue Rock
          </FilterChip>
          <FilterChip defaultPressed>Unlinked</FilterChip>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">Group · one course or none</p>
        <FilterChipGroup
          aria-label="Course"
          value={[course]}
          onValueChange={(values) => setCourse(values[0] ?? "")}
        >
          {courses.map((c) => (
            <FilterChip key={c.name} value={c.name} count={c.count}>
              {c.name}
            </FilterChip>
          ))}
        </FilterChipGroup>
      </div>
    </div>
  );
}
