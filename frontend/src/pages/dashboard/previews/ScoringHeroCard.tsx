import { ScoringHeroCard } from "../components/ScoringHeroCard";

export default function ScoringHeroCardPreview() {
  return (
    <div className="flex flex-col gap-4">
      <ScoringHeroCard
        average={76.8}
        change={0.4}
        recentScores={[85, 69, 72, 78, 80]}
        mix={{ eagle: 0, birdie: 10, par: 40, bogey: 35, double: 10, triple: 5, quad: 0 }}
        mixHoles={90}
        bestRound={69}
        totalRounds={4}
        putts={32}
        girPct={39}
      />
      <ScoringHeroCard
        average={91.2}
        change={-1.3}
        recentScores={[88, 90, 94, 93]}
        mix={{ eagle: 0, birdie: 2, par: 18, bogey: 40, double: 26, triple: 10, quad: 4 }}
        mixHoles={72}
        bestRound={86}
        totalRounds={4}
        putts={null}
        girPct={null}
      />
      <ScoringHeroCard
        average={null}
        change={null}
        recentScores={[]}
        mix={null}
        mixHoles={0}
        bestRound={null}
        totalRounds={0}
        putts={null}
        girPct={null}
      />
    </div>
  );
}
