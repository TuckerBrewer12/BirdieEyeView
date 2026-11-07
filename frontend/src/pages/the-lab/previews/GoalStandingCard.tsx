import { labGoalReport } from "@/testing/fixtures/lab";
import { GoalStandingCard } from "../components/GoalStandingCard";
import { goalStandingFrom } from "@/domain/goal";

export default function GoalStandingCardPreview() {
  const goal = goalStandingFrom(89, labGoalReport)!;
  return (
    <>
      <GoalStandingCard goal={goal} />
      <GoalStandingCard goal={{ ...goal, target: 94, average: 91.7, gap: -2.3, progressPct: 100, onTrack: true }} />
      {/* A goal with no report yet: too few rounds. */}
      <GoalStandingCard goal={goalStandingFrom(79, null)} />
      <GoalStandingCard goal={null} />
    </>
  );
}
