import { ScorecardTable } from "@/brand/components/ScorecardTable";
import { Round, strokesToCheck } from "@/domain";
import { halfMoonBayRound } from "@/testing/fixtures/roundDetails";
import { scannedTeeCard, unsureCard } from "@/testing/fixtures/scan";
import { ScrolledToEnd } from "../ScrolledToEnd";

const linked = Round.fromDto(halfMoonBayRound);
const scanned = Round.fromScan(scannedTeeCard);
const unsure = Round.fromScan(unsureCard.round);
const noop = () => {};

export default function ScorecardTablePreview() {
  return (
    <>
      <ScorecardTable nine={linked.frontNine} label="OUT" teeBox="Blue" />
      <ScrolledToEnd>
        <div className="overflow-x-auto">
          <ScorecardTable nine={linked.backNine} label="IN" round={linked} teeBox="Blue" className="min-w-scorecard" />
        </div>
      </ScrolledToEnd>
      <ScorecardTable nine={scanned.frontNine} label="OUT" teeBox={scanned.teeBox} />
      <ScorecardTable
        nine={unsure.frontNine}
        label="OUT"
        edits={{ onStrokesChange: noop, onPuttsChange: noop, onGirChange: noop }}
        toCheck={[2, ...strokesToCheck(unsureCard)]}
      />
      <ScorecardTable nine={unsure.frontNine} label="OUT" toCheck={[2]} />
    </>
  );
}
