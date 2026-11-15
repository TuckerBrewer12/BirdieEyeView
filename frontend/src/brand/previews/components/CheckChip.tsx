import { useState } from "react";
import { CheckChip } from "@/brand/components/CheckChip";

export default function CheckChipPreview() {
  const [putts, setPutts] = useState(true);
  const [shots, setShots] = useState(false);
  return (
    <div role="group" aria-label="Also on the card" className="flex flex-wrap items-center gap-2">
      <CheckChip checked={putts} onCheckedChange={setPutts}>
        Putts
      </CheckChip>
      <CheckChip checked={shots} onCheckedChange={setShots}>
        Shots to green
      </CheckChip>
    </div>
  );
}
