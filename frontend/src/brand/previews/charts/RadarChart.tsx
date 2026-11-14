import { RadarChart, type RadarAxis } from "@/brand/charts/RadarChart";
import { benchmarkComparisonFrom, buildRadarData, type RadarEntry } from "@/domain";
import { labAnalytics, labBenchmarks } from "@/testing/fixtures/lab";

function axesAgainst(key: string | null): RadarAxis[] {
  const comparison = key ? benchmarkComparisonFrom(labBenchmarks[key]) : null;
  const entries = buildRadarData(labAnalytics.kpis, labAnalytics.scoring_by_par, comparison?.benchmark, comparison?.verdicts);
  return entries.map((entry: RadarEntry) => ({
    label: entry.axis,
    value: entry.value,
    benchmark: comparison ? entry.benchmark : null,
    verdict: comparison ? entry.verdict : null,
    valueLabel: entry.userRaw,
    benchmarkLabel: entry.benchRaw,
  }));
}

export default function RadarChartPreview() {
  const breaks90 = axesAgainst("handicap:15");
  return (
    <>
      <RadarChart axes={breaks90} aria-label="Shape against a 15 handicap" />
      <RadarChart axes={axesAgainst("handicap:5")} aria-label="Shape against a 5 handicap" />
      <RadarChart axes={axesAgainst(null).slice(0, 4)} />
      <RadarChart axes={breaks90.slice(0, 2)} empty="Play a few more rounds to see your shape." />
      <div className="max-w-xs">
        <RadarChart axes={breaks90} compact aria-label="Shape against a 15 handicap, on a phone" />
      </div>
    </>
  );
}
