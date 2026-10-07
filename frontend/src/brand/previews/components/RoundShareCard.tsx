import { RoundShareCard } from "@/brand/components/RoundShareCard";
import { Round } from "@/domain";
import { halfMoonBayRound, scannedRound } from "@/testing/fixtures/roundDetails";

export default function RoundShareCardPreview() {
  return (
    <>
      <RoundShareCard round={Round.fromDto(halfMoonBayRound)} />
      <RoundShareCard round={Round.fromDto(scannedRound)} />
    </>
  );
}
