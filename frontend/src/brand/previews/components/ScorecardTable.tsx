import type { ReactNode } from "react";
import { Card } from "@/brand/components/Card";
import { ScorecardTable } from "@/brand/components/ScorecardTable";
import { Round, strokesToCheck } from "@/domain";
import { scannedTeeCard, unsureCard } from "@/testing/fixtures/scan";
import { fullCardRound } from "@/testing/fixtures/scorecardRound";

const linked = Round.fromDto(fullCardRound);
/** A card the scan read scores and shots-to-green from, but no putts or greens. */
const scanned = Round.fromScan(scannedTeeCard);
/** A card the scan couldn't read every score on. */
const unsure = Round.fromScan(unsureCard.round);
const noop = () => {};

/** The card a table sits in on a scorecard, so the preview reads like the board. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <Card className="gap-0 overflow-x-auto py-0">
      <div className="min-w-scorecard-round px-3 pt-1 pb-2.5">{children}</div>
    </Card>
  );
}

/** The table is wider than the stage, so the preview fills the window: capture it at the board's width. */
export default function ScorecardTablePreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-6 overflow-auto bg-background p-6">
      <Panel>
        <ScorecardTable round={linked} teeBox="Blue" />
      </Panel>
      <Panel>
        <ScorecardTable round={scanned} teeBox={scanned.teeBox} />
      </Panel>
      {/* A scan being checked: one score in doubt, one not read at all. */}
      <Panel>
        <ScorecardTable
          round={unsure}
          edits={{ onStrokesChange: noop, onPuttsChange: noop, onGirChange: noop }}
          toCheck={[2, ...strokesToCheck(unsureCard)]}
        />
      </Panel>
      {/* The same doubt on a card that isn't being edited. */}
      <Panel>
        <ScorecardTable round={unsure} toCheck={[2]} />
      </Panel>
      {/* One nine, closed by its own total, as a phone stacks them. */}
      <Card className="w-preview gap-0 py-0">
        <ScorecardTable round={linked} teeBox="Blue" nine="back" />
      </Card>
    </div>
  );
}
