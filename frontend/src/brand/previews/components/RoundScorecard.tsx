import { RoundScorecard } from "@/brand/components/RoundScorecard";
import { Round } from "@/domain";
import { halfMoonBayRound, scannedRound } from "@/testing/fixtures/roundDetails";
import { ScrolledToEnd } from "../ScrolledToEnd";

const linked = Round.fromDto(halfMoonBayRound);
const noop = () => {};

export default function RoundScorecardPreview() {
  return (
    <>
      <RoundScorecard round={linked} teeBox="Blue" />
      <ScrolledToEnd>
        <RoundScorecard round={linked} teeBox="Blue" />
      </ScrolledToEnd>
      <RoundScorecard
        round={Round.fromDto(scannedRound)}
        edits={{ onStrokesChange: noop, onPuttsChange: noop, onGirChange: noop }}
      />
    </>
  );
}
