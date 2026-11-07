import { RecentRoundsTable } from "../components/RecentRoundsTable";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const rounds = populatedRounds.slice(0, 3).map(Round.fromSummary);

export default function RecentRoundsTablePreview() {
  return <RecentRoundsTable rounds={rounds} onRoundClick={() => {}} />;
}
