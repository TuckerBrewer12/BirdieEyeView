import { ScorecardTable } from "@/brand/components/ScorecardTable";
import { Round, strokesToCheck } from "@/domain";
import { halfMoonBayRound } from "@/testing/fixtures/roundDetails";
import { scannedTeeCard, unsureCard } from "@/testing/fixtures/scan";
import { ScrolledToEnd } from "../ScrolledToEnd";

const linked = Round.fromDto(halfMoonBayRound);
/** A card the scan read scores and shots-to-green from, but no putts or greens. */
const scanned = Round.fromScan(scannedTeeCard);
/** A card the scan couldn't read every score on. */
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
      {/* A scan being checked: one score in doubt, one not read at all. */}
      <ScorecardTable
        nine={unsure.frontNine}
        label="OUT"
        edits={{ onStrokesChange: noop, onPuttsChange: noop, onGirChange: noop }}
        toCheck={[2, ...strokesToCheck(unsureCard)]}
      />
      {/* The same doubt on a card that isn't being edited. */}
      <ScorecardTable nine={unsure.frontNine} label="OUT" toCheck={[2]} />
    </>
  );
}
