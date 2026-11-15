import { useState } from "react";
import { Slider } from "@/brand/components/Slider";

export default function SliderPreview() {
  const [rounds, setRounds] = useState(12);
  return (
    <div className="flex flex-col gap-6">
      <Slider aria-label="Rounds shown" min={5} max={24} value={rounds} onValueChange={setRounds} valueLabel={`Last ${rounds} of 24 rounds`} />
      <Slider aria-label="Rounds shown" min={5} max={24} value={24} onValueChange={() => {}} valueLabel="All 24 rounds" />
    </div>
  );
}
