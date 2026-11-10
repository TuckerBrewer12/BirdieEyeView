import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { SortControl } from "@/brand/components/SortControl";

const options = [
  { value: "date", label: "Date" },
  { value: "score", label: "Score" },
  { value: "to_par", label: "To Par" },
  { value: "course", label: "Course" },
] as const;

export default function SortControlPreview() {
  const [key, setKey] = useState<(typeof options)[number]["value"]>("date");
  const [ascending, setAscending] = useState(false);
  const label = options.find((option) => option.value === key)?.label ?? "Date";

  return (
    <>
      <SortControl
        label={label}
        value={key}
        options={[...options]}
        onChange={setKey}
        ascending={ascending}
        onToggleDirection={() => setAscending((value) => !value)}
      />
      <SortControl
        label="Score"
        value="score"
        options={[...options]}
        onChange={() => {}}
        ascending
        onToggleDirection={() => {}}
        directionDisabled
      />
      {/* No direction: the control only picks, like a filter. */}
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
      {/* A page's sort: "Sort Newest" at 40 tall, an icon alone on a phone. */}
      <SortControl
        label="Newest"
        value="newest"
        options={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
        ]}
        onChange={() => {}}
        prefix="Sort"
        phoneIcon={<ArrowUpDown />}
        quiet
        size="default"
      />
      {/* A page's filter, shorter on a phone. */}
      <SortControl
        label="All courses"
        phoneLabel="Course"
        value="all"
        options={[
          { value: "all", label: "All courses" },
          { value: "home", label: "Home Course" },
        ]}
        onChange={() => {}}
        aria-label="Course"
        size="default"
      />
    </>
  );
}
