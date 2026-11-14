import { Button } from "@/brand/components/Button";
import { RoundScorecard } from "@/brand/components/RoundScorecard";
import { Round } from "@/domain";
import { scannedRound } from "@/testing/fixtures/roundDetails";
import { fullCardRound } from "@/testing/fixtures/scorecardRound";

const linked = Round.fromDto(fullCardRound);
const noop = () => {};

export default function RoundScorecardPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-6 overflow-auto bg-background p-6 *:shrink-0">
      <RoundScorecard round={linked} teeBox="Blue" />
      <RoundScorecard
        round={linked}
        teeBox="BLUE 70.8/123"
        action={
          <Button variant="secondary" size="xs">
            Scan another
          </Button>
        }
      />
      <RoundScorecard
        round={Round.fromDto(scannedRound)}
        edits={{ onStrokesChange: noop, onPuttsChange: noop, onGirChange: noop }}
        toCheck={[3, 12]}
      />
    </div>
  );
}
