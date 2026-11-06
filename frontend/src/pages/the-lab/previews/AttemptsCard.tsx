import { goalAttemptsFrom } from "@/domain";
import { MET_BREAKING_95, MET_NONE, labAttempts, labGoalReport } from "@/testing/fixtures/lab";
import { AttemptsCard } from "../components/AttemptsCard";

export default function AttemptsCardPreview() {
  const breaking90 = goalAttemptsFrom(labGoalReport.attempts);
  const unmet = goalAttemptsFrom(labAttempts(MET_NONE));
  return (
    <>
      <AttemptsCard attempts={breaking90} target={89} timesMet={labGoalReport.rounds_meeting_goal} />
      {/* Nine of the twelve rounds came in at 94 or under. */}
      <AttemptsCard attempts={goalAttemptsFrom(labAttempts(MET_BREAKING_95))} target={94} timesMet={9} />
      <AttemptsCard attempts={unmet} target={79} timesMet={0} />
      {/* The goal's report still loading. */}
      <AttemptsCard attempts={unmet} target={84} timesMet={null} />
    </>
  );
}
