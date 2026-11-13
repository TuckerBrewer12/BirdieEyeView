import { SampleRoundCard } from "../components/SampleRoundCard";
import { SAMPLE_ROUND } from "../sampleRound";

export default function SampleRoundCardPreview() {
  return (
    <div className="bg-muted p-4">
      <SampleRoundCard round={SAMPLE_ROUND} />
    </div>
  );
}
