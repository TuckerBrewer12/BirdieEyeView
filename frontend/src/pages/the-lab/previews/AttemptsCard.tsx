import { labAnalytics, labGoalReport } from "@/testing/fixtures/lab";
import { AttemptsCard } from "../components/AttemptsCard";
import { scoresOf } from "../model";

export default function AttemptsCardPreview() {
  const scores = scoresOf(labAnalytics);
  return (
    <>
      <AttemptsCard scores={scores} target={89} timesMet={labGoalReport.rounds_meeting_goal} />
      {/* Nine of the twelve rounds came in at 94 or under. */}
      <AttemptsCard scores={scores} target={94} timesMet={9} />
      <AttemptsCard scores={scores} target={79} timesMet={0} />
      {/* The goal's report still loading. */}
      <AttemptsCard scores={scores} target={84} timesMet={null} />
    </>
  );
}
