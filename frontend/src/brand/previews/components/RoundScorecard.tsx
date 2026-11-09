import { Button } from "@/brand/components/Button";
import { RoundScorecard } from "@/brand/components/RoundScorecard";
import { Round } from "@/domain";
import { scannedRound } from "@/testing/fixtures/roundDetails";
import { fullCardRound } from "@/testing/fixtures/scorecardRound";

const linked = Round.fromDto(fullCardRound);
const noop = () => {};

/**
 * A scorecard is wider than the stage, so the preview fills the window the way the board does: capture it
 * at the board's width for the full card, and at a phone's for the two nines stacked.
 */
export default function RoundScorecardPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-6 overflow-auto bg-background p-6 *:shrink-0">
      <RoundScorecard round={linked} teeBox="Blue" />
      {/* With an action on the course line. */}
      <RoundScorecard
        round={linked}
        teeBox="Blue"
        action={
          <Button variant="secondary" size="xs">
            Scan another
          </Button>
        }
      />
      {/* A scanned card being edited, not linked to a course, with two scores in doubt. */}
      <RoundScorecard
        round={Round.fromDto(scannedRound)}
        edits={{ onStrokesChange: noop, onPuttsChange: noop, onGirChange: noop }}
        toCheck={[3, 12]}
      />
    </div>
  );
}
