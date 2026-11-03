import { labAnalytics, labGoalReport } from "@/testing/fixtures/lab";
import { PeakGameCard } from "../components/PeakGameCard";
import { peakGameFrom } from "../model";

export default function PeakGameCardPreview() {
  const peak = peakGameFrom(labAnalytics, 89, labGoalReport)!;
  const impacts = labAnalytics.peak_game?.impacts ?? [];
  return (
    <>
      <PeakGameCard peak={peak} impacts={impacts} goalLabel="Break 90" />
      <PeakGameCard peak={{ ...peak, gapToGoal: -4.3, meetsGoal: true }} impacts={[]} goalLabel="Break 95" />
    </>
  );
}
