import { RoundShareCard } from "@/brand/components/RoundShareCard";
import { Round } from "@/domain";
import { ratedHalfMoonBayRound, scannedRound } from "@/testing/fixtures/roundDetails";

/**
 * The image a shared round sends: a linked, rated round (with its net), then a scanned round with
 * no course, which has no par, yards or net to show.
 */
export default function RoundShareCardPreview() {
  return (
    <div className="flex flex-col gap-4">
      <RoundShareCard round={Round.fromDto(ratedHalfMoonBayRound)} />
      <RoundShareCard round={Round.fromDto(scannedRound)} />
    </div>
  );
}
