import { SortControl } from "@/brand/components/SortControl";

export default function SortControlPreview() {
  return (
    <>
      <SortControl
        label="Date"
        value="date"
        options={[
          { value: "date", label: "Date" },
          { value: "score", label: "Score" },
        ]}
        onChange={() => {}}
        ascending={false}
        onToggleDirection={() => {}}
      />
      <SortControl
        label="Score"
        value="score"
        options={[
          { value: "date", label: "Date" },
          { value: "score", label: "Score" },
        ]}
        onChange={() => {}}
        ascending
        onToggleDirection={() => {}}
        directionDisabled
      />
    </>
  );
}
