import { ScorecardTable } from "@/brand/components/ScorecardTable";
import { Round } from "@/domain";
import { halfMoonBayRound } from "@/testing/fixtures/roundDetails";
import { scannedCard } from "@/testing/fixtures/scans";
import { ScrolledToEnd } from "../ScrolledToEnd";

const linked = Round.fromDto(halfMoonBayRound);
/** A card the scan read scores and shots-to-green from, but no putts or greens. */
const scanned = Round.fromScan(scannedCard);

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
    </>
  );
}
