import { ScoringHeroCard } from "../components/ScoringHeroCard";

export default function ScoringHeroCardPreview() {
  return (
    <div className="flex w-preview flex-col gap-4 bg-background p-5">
      <ScoringHeroCard
        average={76.8}
        change={-2.1}
        changeVerdict="good"
        line={[80.2, 78.9, 77.6, 77.9, 76.8]}
        bestRound={69}
        bestCourse="Blue Rock"
        totalRounds={4}
        onBestClick={() => {}}
      />
      <ScoringHeroCard
        average={84.2}
        change={1.4}
        changeVerdict="bad"
        line={[82.1, 82.9, 83.4, 84, 84.2]}
        bestRound={79}
        bestCourse="Half Moon Bay"
        totalRounds={12}
        onBestClick={() => {}}
      />
      <ScoringHeroCard
        average={null}
        change={null}
        changeVerdict={null}
        line={[]}
        bestRound={null}
        bestCourse={null}
        totalRounds={0}
      />
    </div>
  );
}
