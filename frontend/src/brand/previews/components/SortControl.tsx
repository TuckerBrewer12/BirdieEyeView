import { useState } from "react";
import { SortControl } from "@/brand/components/SortControl";

const options = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "best", label: "Best score" },
] as const;

const directionOptions = [
  { value: "date", label: "Date" },
  { value: "score", label: "Score" },
] as const;

export default function SortControlPreview() {
  const [key, setKey] = useState<(typeof options)[number]["value"]>("newest");
  const [directionKey, setDirectionKey] = useState<(typeof directionOptions)[number]["value"]>("date");
  const [ascending, setAscending] = useState(false);
  const label = options.find((option) => option.value === key)?.label ?? "";
  const directionLabel = directionOptions.find((option) => option.value === directionKey)?.label ?? "";

  return (
    <>
      <div className="flex flex-col items-start gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">Sort · picks</p>
        <SortControl caption="Sort" label={label} value={key} options={[...options]} onChange={setKey} />
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">Sort · with direction</p>
        <SortControl
          label={directionLabel}
          value={directionKey}
          options={[...directionOptions]}
          onChange={setDirectionKey}
          ascending={ascending}
          onToggleDirection={() => setAscending((value) => !value)}
        />
        <SortControl
          label="Score"
          value="score"
          options={[...directionOptions]}
          onChange={() => {}}
          ascending
          onToggleDirection={() => {}}
          directionDisabled
        />
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">Filter · no caption</p>
        <SortControl
          label="All Courses"
          value="all"
          options={[
            { value: "all", label: "All Courses" },
            { value: "home", label: "Home Course" },
          ]}
          onChange={() => {}}
          aria-label="Course"
        />
      </div>
    </>
  );
}
