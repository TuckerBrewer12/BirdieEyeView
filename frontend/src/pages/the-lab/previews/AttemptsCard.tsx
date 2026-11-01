import { labAnalytics } from "@/testing/fixtures/lab";
import { AttemptsCard } from "../components/AttemptsCard";
import { roundsMeetingGoal, scoresOf } from "../model";

export default function AttemptsCardPreview() {
  const scores = scoresOf(labAnalytics);
  return (
    <>
      <AttemptsCard scores={scores} target={89} timesMet={roundsMeetingGoal(labAnalytics, 89)} />
      <AttemptsCard scores={scores} target={94} timesMet={roundsMeetingGoal(labAnalytics, 94)} />
      <AttemptsCard scores={scores} target={79} timesMet={0} />
    </>
  );
}
