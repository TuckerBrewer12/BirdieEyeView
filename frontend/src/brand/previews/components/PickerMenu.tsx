import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { PickerMenu } from "@/brand/components/PickerMenu";

const sorts = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "best", label: "Best score" },
] as const;

const courses = [
  { value: "all", label: "All courses" },
  { value: "home", label: "Home Course" },
];

export default function PickerMenuPreview() {
  const [sort, setSort] = useState<(typeof sorts)[number]["value"]>("newest");
  const label = sorts.find((option) => option.value === sort)?.label ?? "Newest";

  return (
    <>
      {/* A filter: boxed, 32 tall in a card's header. */}
      <PickerMenu aria-label="Course" label="All courses" value="all" options={courses} onChange={() => {}} />
      {/* A page's sort: "Sort Newest" set in the text, an icon alone on a phone. */}
      <PickerMenu
        aria-label="Sort by"
        label={label}
        value={sort}
        options={sorts}
        onChange={setSort}
        prefix="Sort"
        compactIcon={<ArrowUpDown />}
        variant="ghost"
        size="default"
      />
      {/* A page's filter beside its search, shorter on a phone. */}
      <PickerMenu
        aria-label="Course"
        label="All courses"
        compactLabel="Course"
        value="all"
        options={courses}
        onChange={() => {}}
        size="default"
      />
      {/* While a pick saves. */}
      <PickerMenu aria-label="Scoring goal" label="Break 90" value="all" options={courses} onChange={() => {}} disabled />
    </>
  );
}
