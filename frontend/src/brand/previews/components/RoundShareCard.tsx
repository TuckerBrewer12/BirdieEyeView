import { RoundShareCard } from "@/brand/components/RoundShareCard";
import { Round } from "@/domain";
import { ratedHalfMoonBayRound, scannedRound } from "@/testing/fixtures/roundDetails";

export default function RoundShareCardPreview() {
  return (
    <div className="flex flex-col gap-4">
      <RoundShareCard round={Round.fromDto(ratedHalfMoonBayRound)} />
      <RoundShareCard round={Round.fromDto(scannedRound)} />
    </div>
  );
}
