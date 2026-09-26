import { GoalCard } from "../components/GoalCard";

export default function GoalCardPreview() {
  return (
    <div className="flex flex-col gap-4">
      <GoalCard
        goal={{ target: 79, average: 81.4, progressPct: 62, onTrack: false, focus: "Fewer three-putts" }}
        onOpen={() => {}}
      />
      <GoalCard
        goal={{ target: 89, average: 86.2, progressPct: 100, onTrack: true, focus: null }}
        onOpen={() => {}}
      />
      <GoalCard goal={null} onOpen={() => {}} />
    </div>
  );
}
