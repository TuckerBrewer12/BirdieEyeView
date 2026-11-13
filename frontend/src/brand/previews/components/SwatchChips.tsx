import { useState } from "react";
import { SwatchChips } from "@/brand/components/SwatchChips";
import { TeeSwatch } from "@/brand/components/TeeSwatch";

const dot = (className: string) => <span aria-hidden className={`size-3 rounded-full ${className}`} />;

export default function SwatchChipsPreview() {
  const [one, setOne] = useState(["blue"]);
  const [many, setMany] = useState(["birdie", "double"]);
  return (
    <div className="flex flex-col gap-4">
      {/* One picked, with a figure after each name. */}
      <SwatchChips
        label="Tee"
        value={one}
        onChange={setOne}
        chips={[
          { value: "black", label: "Black", swatch: <TeeSwatch color="black" className="size-3.5 rounded-full" />, detail: "7,012" },
          { value: "blue", label: "Blue", swatch: <TeeSwatch color="blue" className="size-3.5 rounded-full" />, detail: "6,697" },
        ]}
      />
      {/* Any number on. */}
      <SwatchChips
        multiple
        label="Show"
        value={many}
        onChange={setMany}
        chips={[
          { value: "birdie", label: "Birdies", swatch: dot("bg-score-birdie-base") },
          { value: "bogey", label: "Bogeys", swatch: dot("bg-score-bogey-base") },
          { value: "double", label: "Doubles", swatch: dot("bg-score-double-base") },
        ]}
      />
    </div>
  );
}
