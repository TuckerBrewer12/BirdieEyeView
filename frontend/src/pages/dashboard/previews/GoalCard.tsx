import { GoalCard } from "../components/GoalCard";

export default function GoalCardPreview() {
  return (
    <div className="flex w-80 flex-col gap-4 bg-background p-5">
      <GoalCard goal={{ target: 79, average: 76.8, progressPct: 82, onTrack: true, focus: "Fewer three-putts" }} onOpen={() => {}} />
      <GoalCard goal={{ target: 79, average: 81.4, progressPct: 62, onTrack: false, focus: "Fewer blow-up holes" }} onOpen={() => {}} />
      <GoalCard goal={{ target: 89, average: null, progressPct: null, onTrack: false, focus: null }} onOpen={() => {}} compact />
      <GoalCard goal={null} onOpen={() => {}} />
    </div>
  );
}
