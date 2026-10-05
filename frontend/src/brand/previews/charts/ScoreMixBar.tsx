import { ScoreMixBar } from "@/brand/charts/ScoreMixBar";

export default function ScoreMixBarPreview() {
  return (
    <div className="flex flex-col gap-6">
      <ScoreMixBar mix={{ eagle: 0, birdie: 10, par: 40, bogey: 35, double: 10, triple: 5, quad: 0 }} />
      <ScoreMixBar mix={{ eagle: 1.2, birdie: 18.8, par: 52, bogey: 22, double: 4, triple: 1.6, quad: 0.4 }} />
      <ScoreMixBar mix={{ eagle: 0, birdie: 0, par: 8, bogey: 30, double: 32, triple: 18, quad: 12 }} />
    </div>
  );
}
