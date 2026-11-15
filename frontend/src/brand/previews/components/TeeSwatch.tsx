import { TeeSwatch } from "@/brand/components/TeeSwatch";

const TEES = [
  "Black", "White", "Blue", "Gold", "Yellow", "Red", "Green",
  "Silver", "Orange", "Purple", "Brown", "Championship",
];

export default function TeeSwatchPreview() {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {TEES.map((tee) => (
          <TeeSwatch key={tee} color={tee} className="rounded px-2 py-0.5 text-body-sm font-semibold">
            {tee}
          </TeeSwatch>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {TEES.map((tee) => (
          <TeeSwatch key={tee} color={tee} className="size-3 rounded-full" />
        ))}
      </div>
    </>
  );
}
