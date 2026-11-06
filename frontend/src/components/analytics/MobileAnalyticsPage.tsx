import type { ReactNode } from "react";

type Fmt = (value: unknown, name: unknown, props: unknown) => ReactNode | [ReactNode, string];
type DivergingTooltipPayload = {
  value?: unknown;
  dataKey?: unknown;
  fill?: string;
};

import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SVGTimeSeriesArea } from "@/components/analytics/SVGTimeSeriesArea";
import { BestRoundCard } from "@/components/analytics/BestRoundCard";
import { NarrativeInsight } from "@/components/analytics/NarrativeInsight";
import { ParMatrixGrid } from "@/components/analytics/ParMatrixGrid";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { average, trendDelta } from "@/lib/stats";
import type {
  AnalyticsData, AnalyticsFilters, ScoreTrendRow,
  GIRTrendRow, PuttsTrendRow, ThreePuttRow,
} from "@/types/analytics";
interface Insight {
  text: string;
  trend?: "up" | "down" | "flat";
  positiveUp?: boolean;
  category: "scoring" | "gir" | "putting";
}

interface MobileAnalyticsPageProps {
  data: AnalyticsData;
  filters: AnalyticsFilters;
  setFilters: (f: AnalyticsFilters) => void;
  playedCourses: { id: string; name: string | null; location: string | null }[];
  hasHomeCourse: boolean;
  scoreTrendWithAvg: (ScoreTrendRow & { rolling_avg: number | null })[];
  donutData: { name: string; value: number }[];
  girData: GIRTrendRow[];
  threePuttsData: ThreePuttRow[];
  insights: Insight[];
  bestRound: ScoreTrendRow | null;
  avgPutts: string | null;
  trendPrimary: string;
  trendSecondary: string;
  trendTertiary: string;
  successColor: string;
  dangerColor: string;
  neutralColor: string;
  gridColor: string;
  mutedFill: string;
  scoreColors: Record<string, string>;
}

const SCORE_LABELS: Record<string, string> = {
  eagle: "Eagle+", birdie: "Birdie", par: "Par",
  bogey: "Bogey", double_bogey: "Double",
  triple_bogey: "Triple", quad_bogey: "Quad+",
};


const TABS = ["Scoring", "Ball Striking", "Putting", "Profile", "Range View"] as const;

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
  background: "rgba(15,20,18,0.90)",
  color: "#f9fafb",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};


function ChartCard({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}


function ShortGameRow({ label, value, delta }: {
  label: string;
  value: number | null;
  delta: number | null;
}) {
  if (value == null) return null;
  const significant = delta != null && Math.abs(delta) > 0.5;
  const DeltaIcon = significant ? (delta! > 0 ? TrendingUp : TrendingDown) : Minus;
  const deltaColor = !significant ? "text-gray-300"
    : delta! > 0 ? "text-emerald-500" : "text-red-400";

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-gray-500 w-24 shrink-0">{label}</div>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-sm font-semibold text-gray-900 tabular-nums">{value.toFixed(0)}%</span>
        <DeltaIcon size={11} className={deltaColor} />
        {significant && (
          <span className={`text-[10px] font-semibold ${deltaColor}`}>
            {delta! > 0 ? "+" : ""}{delta!.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

function ChartCarousel({ children }: { children: React.ReactNode[] }) {
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const startX = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);

  function navigate(newIdx: number) {
    setDirection(newIdx > idx ? 1 : -1);
    setIdx(newIdx);
  }

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    startTime.current = Date.now();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (startX.current == null || startTime.current == null) return;
    const dx = e.clientX - startX.current;
    const dt = Math.max(1, Date.now() - startTime.current);
    const velocity = Math.abs(dx) / dt;
    const threshold = velocity > 0.4 ? 20 : 40;
    if (dx < -threshold && idx < children.length - 1) navigate(idx + 1);
    else if (dx > threshold && idx > 0) navigate(idx - 1);
    startX.current = null;
    startTime.current = null;
  }

  return (
    <div onPointerDown={onPointerDown} onPointerUp={onPointerUp} className="touch-pan-y select-none overflow-hidden">
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={idx}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
        >
          {children[idx]}
        </motion.div>
      </AnimatePresence>
      {children.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {children.map((_, i) => (
            <button
              key={i}
              onClick={() => navigate(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-primary" : "bg-gray-200"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}


export function MobileAnalyticsPage({
  data,
  filters,
  setFilters,
  playedCourses,
  hasHomeCourse,
  scoreTrendWithAvg,
  donutData,
  girData,
  threePuttsData,
  insights,
  bestRound,
  avgPutts,
  trendPrimary,
  successColor,
  dangerColor,
  neutralColor,
  gridColor,
  mutedFill,
  scoreColors,
}: MobileAnalyticsPageProps) {
  const [activeTab, setActiveTab] = useState(0);

  const { kpis, scoring_by_par, scoring_by_handicap, scoring_by_yardage, gir_vs_non_gir,
    notable_achievements, scrambling_trend, up_and_down_trend, putts_trend, net_score_trend } = data;

  const scoringInsights = insights.filter((i) => i.category === "scoring");
  const girInsights = insights.filter((i) => i.category === "gir");
  const puttingInsights = insights.filter((i) => i.category === "putting");

  const birdiePct = donutData.find((d) => d.name === "birdie")?.value;

  // Short game deltas (last 5 vs prev 5)
  const scrPct = average(scrambling_trend.slice(-5).map((r) => r.scrambling_percentage));
  const scrDelta = trendDelta(scrambling_trend, (r) => r.scrambling_percentage);
  const udPct = average(up_and_down_trend.slice(-5).map((r) => r.percentage));
  const udDelta = trendDelta(up_and_down_trend, (r) => r.percentage);

  const divergingGirData = useMemo(() =>
    gir_vs_non_gir.map((row) => ({
      bucket:         row.bucket,
      "Birdie":       -(row.birdie ?? 0),
      "Eagle":        -(row.eagle ?? 0),
      "Par":          row.par ?? 0,
      "Bogey":        row.bogey ?? 0,
      "Double":       row.double_bogey ?? 0,
      "Triple+":      (row.triple_bogey ?? 0) + (row.quad_bogey ?? 0),
    })),
  [gir_vs_non_gir]);

  // ── Tab content renderers ────────────────────────────────────────────────

  function renderScoring() {
    return (
      <div className="space-y-3">
        <BestRoundCard
          scoreTrend={data.score_trend}
          netScoreTrend={net_score_trend}
          achievements={notable_achievements}
          compact
        />
        <ChartCarousel key={activeTab}>
          {[
            <div key="score" className="space-y-3">
              <ChartCard title="Score Trend" subtitle="5-round rolling average">
                <SVGTimeSeriesArea
                  data={scoreTrendWithAvg}
                  valueKey="total_score"
                  rollingAvgKey="rolling_avg"
                  indexKey="round_index"
                  color={trendPrimary}
                  gridColor={gridColor}
                  referenceLine={{ y: 72, label: "Par 72" }}
                  gradientSuffix="mScore"
                  showDots={false}
                  height={140}
                  labelFontSize={11}
                  tooltipLabel="Score"
                />
              </ChartCard>
              {scoringInsights[0] && (
                <NarrativeInsight
                  text={scoringInsights[0].text}
                  trend={scoringInsights[0].trend}
                  positiveUp={scoringInsights[0].positiveUp}
                />
              )}
            </div>,
            <ChartCard key="net" title="Net Score Trend" subtitle="Handicap-adjusted">
              <SVGTimeSeriesArea
                data={net_score_trend}
                valueKey="net_score"
                indexKey="round_index"
                color={trendPrimary}
                gridColor={gridColor}
                referenceLine={{ y: 72, label: "Par 72" }}
                gradientSuffix="mNetScore"
                showDots={false}
                height={130}
                labelFontSize={11}
                tooltipLabel="Net Score"
              />
            </ChartCard>,
          ]}
        </ChartCarousel>
      </div>
    );
  }

  function renderBallStriking() {
    const slides: React.ReactNode[] = [
      <div key="gir" className="space-y-3">
        <ChartCard
          title="GIR % per Round"
          subtitle={girData.length < (data.gir_trend ?? []).length ? "Rounds without GIR data excluded" : undefined}
        >
          <SVGTimeSeriesArea
            data={girData}
            valueKey="gir_percentage"
            unit="%"
            indexKey="round_index"
            color={successColor}
            gridColor={gridColor}
            yDomain={[0, 100]}
            gradientSuffix="mGir"
            showDots={girData.length <= 30}
            height={130}
            labelFontSize={11}
            tooltipLabel="GIR %"
            formatTooltipValue={(v) => `${v.toFixed(1)}%`}
          />
        </ChartCard>
        {girInsights[0] && (
          <NarrativeInsight
            text={girInsights[0].text}
            trend={girInsights[0].trend}
            positiveUp={girInsights[0].positiveUp}
          />
        )}
      </div>,
    ];

    if (scrPct != null || udPct != null) {
      slides.push(
        <div key="shortgame" className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="text-sm font-semibold text-gray-800 mb-4">Short Game</div>
          <div className="space-y-4">
            <ShortGameRow label="Scrambling" value={scrPct} delta={scrDelta} />
            <ShortGameRow label="Up & Down" value={udPct} delta={udDelta} />
          </div>
        </div>
      );
    }

    if (divergingGirData.length > 0) {
      slides.push(
        <ChartCard key="girvsnon" title="GIR vs No-GIR">
          <ResponsiveContainer width="100%" height={130}>
            <BarChart
              data={divergingGirData}
              layout="vertical"
              barSize={28}
              margin={{ top: 4, right: 12, left: 52, bottom: 0 }}
            >
              <XAxis
                type="number"
                domain={[-40, 100]}
                tick={{ fontSize: 11, fill: "#6b7280" }}
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
                  <text x={props.x} y={props.y} dy={4} textAnchor="end" fontSize={12} fontWeight={600}
                    fill={props.payload.value === "GIR" ? successColor : dangerColor}
                  >
                    {props.payload.value}
                  </text>
                )}
              />
              <CartesianGrid stroke={gridColor} horizontal={false} />
              <ReferenceLine x={0} stroke="#d1d5db" strokeWidth={1.5} />
              <Tooltip
                content={({ payload, label }: { payload?: readonly DivergingTooltipPayload[]; label?: unknown }) => {
                  if (!payload?.length) return null;
                  const visible = payload.filter((p) => Math.abs(Number(p.value ?? 0)) > 0.05);
                  if (!visible.length) return null;
                  const labelText = String(label ?? "");
                  return (
                    <div style={{ ...tooltipStyle, padding: "8px 10px" }}>
                      <div className="font-semibold text-[11px] mb-1" style={{ color: labelText === "GIR" ? successColor : dangerColor }}>{labelText}</div>
                      {visible.map((p) => (
                        <div key={String(p.dataKey)} className="flex items-center justify-between gap-3">
                          <span style={{ color: p.fill }} className="text-[11px]">{String(p.dataKey ?? "")}</span>
                          <span style={{ color: p.fill }} className="font-bold text-[11px]">{Math.abs(Number(p.value ?? 0)).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar dataKey="Birdie"  fill={successColor}               stackId="neg" />
              <Bar dataKey="Eagle"   fill={scoreColors.eagle}           stackId="neg" radius={[4, 0, 0, 4]} />
              <Bar dataKey="Par"     fill={mutedFill}                   stackId="pos" />
              <Bar dataKey="Bogey"   fill={dangerColor}                 stackId="pos" />
              <Bar dataKey="Double"  fill={scoreColors.double_bogey}    stackId="pos" />
              <Bar dataKey="Triple+" fill={scoreColors.triple_bogey}    stackId="pos" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-3 mt-2.5 justify-center flex-wrap">
            {[
              { label: "Birdie",  color: successColor             },
              { label: "Eagle",   color: scoreColors.eagle        },
              { label: "Par",     color: mutedFill                },
              { label: "Bogey",   color: dangerColor              },
              { label: "Double",  color: scoreColors.double_bogey },
              { label: "Triple+", color: scoreColors.triple_bogey },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
                <span className="text-[11px] font-semibold text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      );
    }

    return (
      <ChartCarousel key={activeTab}>{slides}</ChartCarousel>
    );
  }

  function renderPutting() {
    const puttsSlides: React.ReactNode[] = [
      <ChartCard key="putts" title="Total Putts per Round">
        <SVGTimeSeriesArea
          data={putts_trend.filter((r: PuttsTrendRow) => r.total_putts != null)}
          valueKey="total_putts"
          indexKey="round_index"
          color={neutralColor}
          gridColor={gridColor}
          referenceLine={{ y: 36, label: "36" }}
          gradientSuffix="mPutts"
          showDots={true}
          height={130}
          labelFontSize={11}
          tooltipLabel="Putts"
        />
      </ChartCard>,
    ];
    if (threePuttsData.length > 0) {
      puttsSlides.push(
        <ChartCard key="3putts" title="3-Putts per Round" subtitle="Holes with 3+ putts">
          <SVGTimeSeriesArea
            data={threePuttsData}
            valueKey="three_putt_count"
            indexKey="round_index"
            color={dangerColor}
            gridColor={gridColor}
            yDomain={[0, "auto"]}
            referenceLine={{ y: 2, label: "2" }}
            gradientSuffix="mThreePutts"
            showDots={true}
            height={120}
            labelFontSize={11}
            tooltipLabel="3-Putts"
          />
        </ChartCard>
      );
    }

    return (
      <div className="space-y-3">
        {puttingInsights[0] && (
          <NarrativeInsight
            text={puttingInsights[0].text}
            trend={puttingInsights[0].trend}
            positiveUp={puttingInsights[0].positiveUp}
          />
        )}
        <ChartCarousel key={activeTab}>{puttsSlides}</ChartCarousel>
      </div>
    );
  }

  function renderProfile() {
    const profileSlides: React.ReactNode[] = [
      <ChartCard key="donut" title="Score Mix" subtitle="Breakdown across all rounds">
        <div className="flex items-center gap-4">
          <div className="relative h-[140px] w-[140px] shrink-0">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={58} paddingAngle={2} dataKey="value" stroke="none">
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={scoreColors[entry.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle}
                  formatter={((v: number, name: string) => [`${v.toFixed(1)}%`, SCORE_LABELS[name] ?? name]) as Fmt}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {birdiePct != null && (
                <>
                  <div className="text-lg font-black text-gray-800">{birdiePct.toFixed(0)}%</div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: successColor }}>birdies</div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: scoreColors[d.name] }} />
                <span className="text-xs text-gray-500 flex-1 truncate">{SCORE_LABELS[d.name] ?? d.name}</span>
                <span className="text-xs font-semibold text-gray-700 tabular-nums">{d.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>,
      <ChartCard key="bypar" title="Avg Score to Par by Hole Par">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={scoring_by_par} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} vertical={false} />
            <XAxis dataKey="par" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false}
              tickFormatter={(v) => `Par ${v}`}
            />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false}
              tickFormatter={(v) => (v > 0 ? `+${v}` : v)}
            />
            <Tooltip contentStyle={tooltipStyle}
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
      </ChartCard>,
      <ChartCard key="byhcp" title="Avg Score by Hole Difficulty" subtitle="Handicap 1 (hardest) → 18 (easiest)">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={scoring_by_handicap} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} vertical={false} />
            <XAxis dataKey="handicap" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false}
              tickFormatter={(v) => (v > 0 ? `+${v}` : v)}
            />
            <Tooltip contentStyle={tooltipStyle}
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
      </ChartCard>,
    ];


    return <ChartCarousel key={activeTab}>{profileSlides}</ChartCarousel>;
  }

  function renderRangeView() {
    if (!scoring_by_yardage.length) {
      return (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          Play more rounds to unlock Range View data.
        </div>
      );
    }
    return <ParMatrixGrid rows={scoring_by_yardage} />;
  }

  const tabContent = [renderScoring, renderBallStriking, renderPutting, renderProfile, renderRangeView];

  return (
    <div className="space-y-4">

      {/* ── Header (title + filter + stat strip) ─────────────────────────── */}
      <AnalyticsHeader
        totalRounds={kpis.total_rounds}
        handicapIndex={kpis.handicap_index}
        scoringAvg={kpis.scoring_average}
        bestScore={bestRound?.total_score ?? null}
        avgPutts={avgPutts}
        girPct={kpis.gir_percentage}
        filters={filters}
        setFilters={setFilters}
        playedCourses={playedCourses}
        hasHomeCourse={hasHomeCourse}
        accentHcap={trendPrimary}
        accentAvg={scoreColors.bogey ?? "#f87171"}
        accentBest={scoreColors.double_bogey ?? "#60a5fa"}
        accentPutts={scoreColors.triple_bogey ?? "#a78bfa"}
        accentGir={successColor}
      />

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid #e4e9e1",
        padding: "8px 16px 0",
        display: "flex",
        gap: 18,
        overflowX: "auto",
        scrollbarWidth: "none",
      }} className="[&::-webkit-scrollbar]:hidden">
        {TABS.map((tab, i) => {
          const isActive = activeTab === i;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                flexShrink: 0,
                padding: "10px 0 12px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: '"DM Sans", system-ui, sans-serif',
                color: isActive ? "#131613" : "#6b7765",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid #2d7a3a" : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                lineHeight: 1,
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── Active tab content ─────────────────────────────────────────────── */}
      {tabContent[activeTab]()}

    </div>
  );
}
