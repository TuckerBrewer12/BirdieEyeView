import type { ReactNode } from "react";

type Fmt = (value: unknown, name: unknown, props: unknown) => ReactNode | [ReactNode, string];
type DivergingTooltipPayload = {
  value?: unknown;
  dataKey?: unknown;
  fill?: string;
};

import { useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { SVGTimeSeriesArea } from "@/components/analytics/SVGTimeSeriesArea";
import { TrendingDown, Gauge, Hash, Trophy, Target } from "lucide-react";
import { SCORE_COLORS, SCORE_LABELS } from "@/lib/colors";
import { ScrollSection } from "@/components/analytics/ScrollSection";
import { BestRoundCard } from "@/components/analytics/BestRoundCard";
import { ParMatrixGrid } from "@/components/analytics/ParMatrixGrid";
import { AnalyticsCommandCenter } from "@/components/analytics/AnalyticsCommandCenter";
import type { AnalyticsViewModel } from "@/hooks/useAnalyticsViewModel";

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.32)",
  background: "rgba(15,20,18,0.90)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  color: "#f1f5f9",
};
const tooltipTextStyle = { fill: "#f1f5f9", color: "#f1f5f9" };

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-[11px] font-bold text-primary uppercase tracking-[0.18em] whitespace-nowrap">{children}</span>
      <div className="h-px flex-1 bg-primary/15 rounded-full" />
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="analytics-chart-card bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function formatHI(hi: number | null | undefined): string | null {
  if (hi == null) return null;
  if (hi < 0) return `+${Math.abs(hi)}`;
  return String(hi);
}

export function AnalyticsDesktopLayout(vm: AnalyticsViewModel) {
  // Desktop-only: interactive donut slice hover
  const [activeSlice, setActiveSlice] = useState<string | null>(null);

  const {
    data, filters, setFilters, playedCourses, hasHomeCourse, safeKpis,
    scoreTrendWithAvg, donutData, girData, threePuttsData,
    bestRound, avgPutts, divergingGirData,
    trendPrimary, trendSecondary, trendTertiary,
    successColor, dangerColor, neutralColor, gridColor, mutedFill, scoreColors,
  } = vm;

  if (!data) return null;

  const {
    kpis, net_score_trend, putts_trend,
    scoring_by_par, scoring_by_yardage, scoring_by_handicap, gir_vs_non_gir,
    notable_achievements, scrambling_trend, up_and_down_trend,
  } = data;

  const birdiePct = donutData.find((d) => d.name === "birdie")?.value;

  return (
    <div>
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-3">Analytics</h1>

      <AnalyticsCommandCenter
        filters={filters}
        onChange={setFilters}
        playedCourses={playedCourses}
        hasHomeCourse={hasHomeCourse}
        kpis={safeKpis}
      />

      {/* KPI Bento Bar */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-[130px] bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center relative">
          <Gauge size={13} className="absolute top-3 right-3 text-gray-200" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Handicap Index</span>
          <span className="text-3xl font-bold text-gray-900 tracking-tighter">{formatHI(kpis.handicap_index) ?? "—"}</span>
        </div>

        {(
          [
            { label: "Rounds",      value: kpis.total_rounds,             icon: Hash,        subtitle: undefined },
            { label: "Scoring Avg", value: kpis.scoring_average,          icon: TrendingDown, subtitle: undefined },
            { label: "Best Round",  value: bestRound?.total_score ?? null, icon: Trophy,
              subtitle: (() => {
                const ev = notable_achievements?.scoring_records_events?.lifetime?.lowest_score;
                return ev?.course;
              })() },
            { label: "Avg Putts",   value: avgPutts,                      icon: Target,      subtitle: undefined },
          ] as { label: string; value: string | number | null; icon: typeof Hash; subtitle?: string }[]
        ).map(({ label, value, icon: Icon, subtitle }) => (
          <div
            key={label}
            className="flex-1 min-w-[110px] bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center relative"
          >
            <Icon size={13} className="absolute top-3 right-3 text-gray-200" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</span>
            <span className="text-3xl font-bold text-gray-900 tracking-tighter">{value ?? "—"}</span>
            {subtitle && <span className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</span>}
          </div>
        ))}
      </div>

      {/* Best Round */}
      <div className="mb-5">
        <BestRoundCard
          scoreTrend={data.score_trend}
          netScoreTrend={data.net_score_trend}
          achievements={notable_achievements}
        />
      </div>

      {/* Chart Grid */}
      <ScrollSection>
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* Left column */}
          <div className="flex flex-col gap-5 flex-1 min-w-0">
            <SectionLabel>Scoring</SectionLabel>

            <ChartCard title="Score Trend" subtitle="5-round rolling average">
              <SVGTimeSeriesArea
                dualTone
                data={scoreTrendWithAvg}
                valueKey="total_score"
                rollingAvgKey="rolling_avg"
                indexKey="round_index"
                color={trendPrimary}
                gridColor={gridColor}
                referenceLine={{ y: kpis.scoring_average ?? 90, label: `Avg ${kpis.scoring_average}` }}
                gradientSuffix="score"
                labelFontSize={11}
                showDots={false}
                height={130}
                tooltipLabel="Score"
              />
            </ChartCard>

            <SectionLabel>Ball Striking</SectionLabel>

            <ChartCard
              title="GIR % per Round"
              subtitle={girData.length < (data?.gir_trend ?? []).length ? "Rounds without GIR data excluded" : undefined}
            >
              <SVGTimeSeriesArea
                data={girData}
                valueKey="gir_percentage"
                unit="%"
                indexKey="round_index"
                color={successColor}
                gridColor={gridColor}
                yDomain={["auto", "auto"]}
                gradientSuffix="gir"
                labelFontSize={11}
                showDots={girData.length <= 30}
                height={130}
                tooltipLabel="GIR %"
                formatTooltipValue={(v) => `${v.toFixed(1)}%`}
              />
            </ChartCard>

            {(scrambling_trend.length > 0 || up_and_down_trend.length > 0) && (
              <ChartCard title="Short Game" subtitle="Scrambling % vs Up & Down %">
                <SVGTimeSeriesArea
                  data={scrambling_trend.map((r, i) => ({
                    ...r,
                    up_and_down_pct: up_and_down_trend[i]?.percentage ?? null,
                  }))}
                  valueKey="scrambling_percentage"
                  secondaryValueKey="up_and_down_pct"
                  secondaryColor={trendTertiary}
                  indexKey="round_index"
                  unit="%"
                  color={trendSecondary}
                  gridColor={gridColor}
                  yDomain={["auto", "auto"]}
                  tooltipLabel="Scrambling"
                  secondaryTooltipLabel="Up & Down"
                  gradientSuffix="shortGame"
                  labelFontSize={11}
                  showDots={true}
                  height={130}
                  formatTooltipValue={(v) => `${v.toFixed(1)}%`}
                />
              </ChartCard>
            )}

            <SectionLabel>Putting</SectionLabel>

            <ChartCard title="Total Putts per Round">
              <SVGTimeSeriesArea
                data={putts_trend.filter((r) => r.total_putts != null)}
                valueKey="total_putts"
                indexKey="round_index"
                color={neutralColor}
                gridColor={gridColor}
                referenceLine={{ y: 36, label: "36" }}
                gradientSuffix="putts"
                labelFontSize={11}
                showDots={true}
                height={130}
                tooltipLabel="Putts"
              />
            </ChartCard>

            {threePuttsData.length > 0 && (
              <ChartCard title="3-Putts per Round" subtitle="Holes with 3+ putts">
                <SVGTimeSeriesArea
                  data={threePuttsData}
                  valueKey="three_putt_count"
                  indexKey="round_index"
                  color={dangerColor}
                  gridColor={gridColor}
                  yDomain={["auto", "auto"]}
                  referenceLine={{ y: 2, label: "2" }}
                  gradientSuffix="threePutts"
                  labelFontSize={11}
                  showDots={true}
                  height={130}
                  tooltipLabel="3-Putts"
                />
              </ChartCard>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5 flex-1 min-w-0">
            <ChartCard title="Net Score Trend" subtitle="Handicap-adjusted score per round">
              <SVGTimeSeriesArea
                dualTone
                data={net_score_trend}
                valueKey="net_score"
                indexKey="round_index"
                color={trendPrimary}
                gridColor={gridColor}
                referenceLine={{ y: 72, label: "Par 72" }}
                gradientSuffix="netScore"
                labelFontSize={11}
                showDots={false}
                height={130}
                tooltipLabel="Net Score"
                renderTooltipExtra={(row) => (
                  <>
                    {row.course_name && (
                      <div className="text-[11px] text-gray-400 mt-1 truncate max-w-[160px]">{row.course_name}</div>
                    )}
                    <div className="border-t border-white/10 mt-1.5 pt-1.5 flex flex-col gap-0.5">
                      {row.to_par != null && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-400">To Par</span>
                          <span className={`font-bold ${row.to_par < 0 ? "text-emerald-400" : row.to_par > 0 ? "text-red-400" : "text-gray-400"}`}>
                            {row.to_par > 0 ? `+${row.to_par}` : row.to_par === 0 ? "E" : row.to_par}
                          </span>
                        </div>
                      )}
                      {row.course_handicap != null && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-400">Course HCP</span>
                          <span className="font-bold text-white">
                            {row.course_handicap < 0 ? `+${Math.abs(row.course_handicap)}` : row.course_handicap}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              />
            </ChartCard>

            {/* Score Mix — interactive donut */}
            <ChartCard title="Score Mix" subtitle="Career breakdown across all rounds">
              <div className="flex items-center gap-4">
                <div className="relative h-[180px] w-[180px] shrink-0">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_: unknown, index: number) => setActiveSlice(donutData[index]?.name ?? null)}
                        onMouseLeave={() => setActiveSlice(null)}
                      >
                        {donutData.map((entry) => (
                          <Cell key={entry.name} fill={(scoreColors as Record<string, string>)[entry.name]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {activeSlice ? (
                      <>
                        <div className="text-xl font-black text-gray-800">
                          {donutData.find((d) => d.name === activeSlice)?.value.toFixed(1)}%
                        </div>
                        <div
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: (scoreColors as Record<string, string>)[activeSlice] }}
                        >
                          {SCORE_LABELS[activeSlice]}
                        </div>
                      </>
                    ) : birdiePct != null ? (
                      <>
                        <div className="text-xl font-black text-gray-800">{birdiePct.toFixed(0)}%</div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: successColor }}>
                          birdies
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  {donutData.map((d) => (
                    <div
                      key={d.name}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1 cursor-default transition-colors ${activeSlice === d.name ? "bg-gray-50" : ""}`}
                      onMouseEnter={() => setActiveSlice(d.name)}
                      onMouseLeave={() => setActiveSlice(null)}
                    >
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: (scoreColors as Record<string, string>)[d.name] }} />
                      <span className="text-xs text-gray-500 flex-1 truncate">{SCORE_LABELS[d.name] ?? d.name}</span>
                      <span className="text-xs font-semibold text-gray-700 tabular-nums">{d.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <SectionLabel>Performance Profile</SectionLabel>

            <ChartCard title="Avg Score to Par by Hole Par">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={scoring_by_par} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="par" tick={{ fontSize: 13, fill: "#374151", fontWeight: 700 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `Par ${v}`}
                  />
                  <YAxis tick={{ fontSize: 12, fill: "#6b7280", fontWeight: 700 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => (v > 0 ? `+${v}` : v)}
                  />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipTextStyle} itemStyle={tooltipTextStyle}
                    formatter={((v: number) => [v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2), "Avg to Par"]) as Fmt}
                  />
                  <ReferenceLine y={0} stroke={mutedFill} />
                  <Bar dataKey="average_to_par" radius={[6, 6, 0, 0]}>
                    {scoring_by_par.map((row) => (
                      <Cell key={row.par} fill={row.average_to_par <= 0 ? successColor : dangerColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Avg Score by Hole Difficulty" subtitle="Handicap 1 (hardest) → 18 (easiest)">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={scoring_by_handicap} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="handicap" tick={{ fontSize: 12, fill: "#374151", fontWeight: 700 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6b7280", fontWeight: 700 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => (v > 0 ? `+${v}` : v)}
                  />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipTextStyle} itemStyle={tooltipTextStyle}
                    formatter={((v: number, _: unknown, props: { payload: { sample_size: number } }) => [
                      `${v > 0 ? "+" : ""}${v.toFixed(2)} (${props.payload.sample_size} holes)`,
                      "Avg to Par",
                    ]) as Fmt}
                    labelFormatter={(l) => `Hcp ${l}`}
                  />
                  <ReferenceLine y={0} stroke={mutedFill} />
                  <Bar dataKey="average_to_par" radius={[4, 4, 0, 0]}>
                    {scoring_by_handicap.map((row) => (
                      <Cell key={row.handicap} fill={row.average_to_par <= 0 ? successColor : dangerColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Range View */}
        {scoring_by_yardage.length > 0 && (
          <div className="mt-5">
            <ParMatrixGrid rows={scoring_by_yardage} />
          </div>
        )}

        {/* GIR vs No-GIR */}
        {gir_vs_non_gir.length > 0 && (
          <div className="mt-5">
            <ChartCard title="GIR vs No-GIR">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart
                  data={divergingGirData}
                  layout="vertical"
                  barSize={28}
                  margin={{ top: 4, right: 16, left: 56, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    domain={[-40, 100]}
                    ticks={[-40, -20, 0, 20, 40, 60, 80, 100]}
                    tick={{ fontSize: 12, fill: "#111827", fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${Math.abs(v)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="bucket"
                    tickLine={false}
                    axisLine={false}
                    tick={(props: { x: string | number; y: string | number; payload: { value: string } }) => (
                      <text
                        x={props.x}
                        y={props.y}
                        dy={4}
                        textAnchor="end"
                        fontSize={14}
                        fontWeight={700}
                        fill={props.payload.value === "GIR" ? successColor : dangerColor}
                      >
                        {props.payload.value}
                      </text>
                    )}
                  />
                  <CartesianGrid stroke="#d1d5db" horizontal={false} />
                  <ReferenceLine x={0} stroke="#d1d5db" strokeWidth={1.5} />
                  <Tooltip
                    content={({ payload, label }: { payload?: readonly DivergingTooltipPayload[]; label?: unknown }) => {
                      if (!payload?.length) return null;
                      const visible = payload.filter((p) => Math.abs(Number(p.value ?? 0)) > 0.05);
                      if (!visible.length) return null;
                      const labelText = String(label ?? "");
                      return (
                        <div style={{ ...tooltipStyle, padding: "10px 12px" }}>
                          <div className="font-semibold text-[11px] mb-1.5" style={{ color: labelText === "GIR" ? successColor : dangerColor }}>{labelText}</div>
                          {visible.map((p) => (
                            <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
                              <span style={{ color: p.fill }}>{String(p.dataKey ?? "")}</span>
                              <span style={{ color: p.fill }} className="font-bold">{Math.abs(Number(p.value ?? 0)).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="Birdie"   fill={successColor}                           stackId="neg" />
                  <Bar dataKey="Eagle"    fill={(SCORE_COLORS as Record<string, string>).eagle}         stackId="neg" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="Par"      fill={mutedFill}                              stackId="pos" />
                  <Bar dataKey="Bogey"    fill={dangerColor}                            stackId="pos" />
                  <Bar dataKey="Double"   fill={(SCORE_COLORS as Record<string, string>).double_bogey}  stackId="pos" />
                  <Bar dataKey="Triple+"  fill={(SCORE_COLORS as Record<string, string>).triple_bogey}  stackId="pos" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-3 justify-center flex-wrap">
                {[
                  { label: "Birdie",  color: successColor },
                  { label: "Eagle",   color: (SCORE_COLORS as Record<string, string>).eagle },
                  { label: "Par",     color: mutedFill },
                  { label: "Bogey",   color: dangerColor },
                  { label: "Double",  color: (SCORE_COLORS as Record<string, string>).double_bogey },
                  { label: "Triple+", color: (SCORE_COLORS as Record<string, string>).triple_bogey },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                    <span className="text-[11px] font-semibold text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        )}

      </ScrollSection>
    </div>
  );
}
