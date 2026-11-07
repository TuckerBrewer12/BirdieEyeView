import { goalStandingFrom } from "@/domain/goal";
import { GoalCard } from "../components/GoalCard";

const threePutts = {
  kind: "three_putt_bleed",
  strokesSaved: 1.2,
  shareOfGap: 50,
  headline: "Fewer three-putts",
  detail: "",
} as const;

export default function GoalCardPreview() {
  const breakEighty = goalStandingFrom(79, null)!;
  const breakNinety = goalStandingFrom(89, null)!;
  return (
    <div className="flex flex-col gap-4">
      <GoalCard
        goal={{ ...breakEighty, average: 81.4, progressPct: 62, savers: [threePutts] }}
        onOpen={() => {}}
      />
      <GoalCard
        goal={{ ...breakNinety, average: 86.2, progressPct: 100, onTrack: true }}
        onOpen={() => {}}
      />
      <GoalCard goal={null} onOpen={() => {}} />
    </div>
  );
}
