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
      <PickerMenu aria-label="Course" label="All courses" value="all" options={courses} onChange={() => {}} />
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
      <PickerMenu
        aria-label="Course"
        label="All courses"
        compactLabel="Course"
        value="all"
        options={courses}
        onChange={() => {}}
        size="default"
      />
      <div className="flex w-80 gap-2">
        <PickerMenu aria-label="Rounds" label="Last 50 rounds" value="all" options={courses} onChange={() => {}} size="default" fill />
        <PickerMenu aria-label="Course" label="All courses" value="all" options={courses} onChange={() => {}} size="default" fill />
      </div>
      <PickerMenu aria-label="Scoring goal" label="Break 90" value="all" options={courses} onChange={() => {}} disabled />
    </>
  );
}
