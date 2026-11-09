import { Round } from "@/domain";
import { populatedDashboard } from "@/testing/fixtures/dashboard";
import { LastRoundCard } from "../components/LastRoundCard";

const round = Round.fromSummary(populatedDashboard.recent_rounds[0]);

export default function LastRoundCardPreview() {
  return (
    <div className="flex flex-col gap-6 bg-background p-5">
      <div className="w-240">
        <LastRoundCard round={round} />
      </div>
      <div className="w-88">
        <LastRoundCard compact round={round} />
      </div>
    </div>
  );
}
