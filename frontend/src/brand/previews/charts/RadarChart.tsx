import { RadarChart, type RadarAxis } from "@/brand/charts/RadarChart";
import { benchmarkComparisonFrom, buildRadarData, type RadarEntry } from "@/domain";
import { labAnalytics, labBenchmarks } from "@/testing/fixtures/lab";

/** The Lab golfer's shape against a comparison, as The Lab's performance card draws it. */
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
      {/* Ahead of a 15 handicap on GIR, scrambling, putting and par 5s; behind on par 3s and 4s. */}
      <RadarChart axes={breaks90} aria-label="Shape against a 15 handicap" />
      {/* Behind a 5 handicap on every axis. */}
      <RadarChart axes={axesAgainst("handicap:5")} aria-label="Shape against a 5 handicap" />
      {/* No comparison: the shape alone, on four axes. */}
      <RadarChart axes={axesAgainst(null).slice(0, 4)} />
      <RadarChart axes={breaks90.slice(0, 2)} empty="Play a few more rounds to see your shape." />
      {/* On a phone: the compact drawing at a phone's width. */}
      <div className="max-w-xs">
        <RadarChart axes={breaks90} compact aria-label="Shape against a 15 handicap, on a phone" />
      </div>
    </>
  );
}
