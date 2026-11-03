import { useState } from "react";
import { FilterChip } from "@/brand/components/FilterChip";
import { SortControl } from "@/brand/components/SortControl";
import { ToggleGroup, ToggleGroupItem } from "@/brand/components/ToggleGroup";

const courses = [
  { name: "Half Moon Bay", count: 2 },
  { name: "Blue Rock", count: 1 },
  { name: "Unlinked", count: 1 },
];

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

export default function FilterChipPreview() {
  const [course, setCourse] = useState<string | null>(null);
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("newest");
  const sortLabel = sortOptions.find((option) => option.value === sort)?.label ?? "";
  const shown = courses.find((c) => c.name === course)?.count ?? 4;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">Chip · off, selected, no count</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip count={2}>Half Moon Bay</FilterChip>
          <FilterChip count={1} selected>
            Blue Rock
          </FilterChip>
          <FilterChip selected>Unlinked</FilterChip>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">
          Filter bar · segmented scope + course chips + sort
        </p>
        <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup variant="outline" spacing={2} defaultValue={["all"]}>
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="l20">Last 20</ToggleGroupItem>
              <ToggleGroupItem value="best">Best</ToggleGroupItem>
            </ToggleGroup>
            <div className="h-6 w-px bg-border" />
            <div className="order-last flex basis-full flex-wrap gap-1.5">
              {courses.map((c) => (
                <FilterChip
                  key={c.name}
                  count={c.count}
                  selected={course === c.name}
                  onSelectedChange={(on) => setCourse(on ? c.name : null)}
                >
                  {c.name}
                </FilterChip>
              ))}
            </div>
            <SortControl
              className="ml-auto"
              caption="Sort"
              label={sortLabel}
              value={sort}
              options={[...sortOptions]}
              onChange={setSort}
            />
          </div>
          <div className="h-px bg-chart-grid" />
          <div className="flex justify-between px-1 text-body-sm text-foreground-secondary">
            <span>
              <b className="text-foreground">{shown}</b> rounds
            </span>
            <span className="text-muted-foreground">{course ? `All · ${course}` : "All rounds"}</span>
          </div>
        </div>
      </div>
    </>
  );
}
