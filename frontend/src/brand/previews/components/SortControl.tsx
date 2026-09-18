import { useState } from "react";
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
    </>
  );
}
