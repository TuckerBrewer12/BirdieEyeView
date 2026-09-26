import { RecentRoundsTable } from "../components/RecentRoundsTable";
import { roundFromSummary } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

export default function RecentRoundsTablePreview() {
  return (
    <RecentRoundsTable rounds={populatedRounds.slice(0, 3).map(roundFromSummary)} onRoundClick={() => {}} />
  );
}
