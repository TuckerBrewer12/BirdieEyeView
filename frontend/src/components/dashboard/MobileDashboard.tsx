import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { line, area, curveMonotoneX } from "d3-shape";
import { X } from "lucide-react";
import type { DashboardData } from "@/types/golf";
import type { AnalyticsData, GoalReport } from "@/types/analytics";
import type { DualTrendPoint, ScoreDistItem } from "@/hooks/useDashboardViewModel";
import { formatCourseName } from "@/lib/courseName";
import { api } from "@/lib/api";

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK     = "#131613";
const MUTED   = "#6b7765";
const LINE    = "#e4e9e1";
const TICK    = "#1b2b1e";
const PRIMARY = "#2d7a3a";
const SANS    = '"Inter", system-ui, -apple-system, sans-serif';
const MONO    = '"Inter", system-ui, -apple-system, sans-serif';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatHI(hi: number | null | undefined): string {
  if (hi == null) return "—";
  if (hi < 0) return `+${Math.abs(hi).toFixed(1)}`;
  return hi.toFixed(1);
}

function getDotColor(toPar: number | null): string {
  if (toPar == null) return "#9ca3af";
  if (toPar <= -2) return "#b45309";
  if (toPar === -1) return "#059669";
  if (toPar === 0) return "#9ca3af";
  return "#ef4444";
}

function getBarColor(d: DualTrendPoint): string {
  if (d.used_in_hi == null) return "#9ca3af";
  if (d.used_in_hi) return "#059669";
  if (d.hi_threshold != null && d.differential != null && d.differential - d.hi_threshold <= 2)
    return "#d97706";
  return "#dc2626";
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type HoleKey = "eagle" | "birdie" | "par" | "bogey" | "double_bogey" | "triple_bogey" | "quad_bogey";

function getScoreKey(strokes: number | null | undefined, par: number | null | undefined): HoleKey {
  if (strokes == null || par == null) return "par";
  const diff = strokes - par;
  if (diff <= -2) return "eagle";
  if (diff === -1) return "birdie";
  if (diff === 0) return "par";
  if (diff === 1) return "bogey";
  if (diff === 2) return "double_bogey";
  if (diff === 3) return "triple_bogey";
  return "quad_bogey";
}

function scoreBarHeightPct(strokes: number | null | undefined, par: number | null | undefined): number {
  if (strokes == null || par == null) return 38;
  const diff = strokes - par;
  if (diff <= -1) return 22;
  if (diff === 0) return 38;
  return Math.min(100, 38 + diff * 14);
}

// ─── Dot separator ────────────────────────────────────────────────────────────
function Dot() {
  return (
    <span style={{
      display: "inline-block",
      width: 3, height: 3,
      borderRadius: "50%",
      background: "currentColor",
      opacity: 0.5,
      verticalAlign: "middle",
      margin: "0 4px",
    }} />
  );
}

// ─── Hero sparkline ───────────────────────────────────────────────────────────
function HeroSparkline({ data }: { data: DualTrendPoint[] }) {
  const valid = data.filter((d) => d.total_score != null);
  if (valid.length < 3) return null;

  const W = 300;
  const H = 56;
  const PAD = { top: 5, right: 5, bottom: 5, left: 5 };

  const scores = valid.map((d) => d.total_score!);
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS || 1;

  const xScale = scaleLinear().domain([0, valid.length - 1]).range([PAD.left, W - PAD.right]);
  const yScale = scaleLinear().domain([minS - range * 0.15, maxS + range * 0.15]).range([H - PAD.bottom, PAD.top]);

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const meanY = yScale(mean);

  const lineFn = line<DualTrendPoint>()
    .x((_, i) => xScale(i))
    .y((d) => yScale(d.total_score!))
    .curve(curveMonotoneX);

  const areaFn = area<DualTrendPoint>()
    .x((_, i) => xScale(i))
    .y0(H - PAD.bottom)
    .y1((d) => yScale(d.total_score!))
    .curve(curveMonotoneX);

  const pathD = lineFn(valid) ?? "";
  const areaD = areaFn(valid) ?? "";
  const lastX = xScale(valid.length - 1);
  const lastY = yScale(valid[valid.length - 1].total_score!);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id="heroAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.22} />
          <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
        </linearGradient>
      </defs>
      <line
        x1={PAD.left} x2={W - PAD.right}
        y1={meanY} y2={meanY}
        stroke="#cdd6c8" strokeWidth={1} strokeDasharray="3 3"
      />
      <path d={areaD} fill="url(#heroAreaGrad)" stroke="none" />
      <path d={pathD} fill="none" stroke={PRIMARY} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3.5} fill="white" stroke={PRIMARY} strokeWidth={2} />
    </svg>
  );
}

// ─── Per-hole micro bar strip ─────────────────────────────────────────────────
type HoleScore = { hole_number: number; strokes?: number | null; par_played?: number | null };

function MicroBars({ holes, scoreColors }: { holes: HoleScore[]; scoreColors: Record<string, string> }) {
  const sorted = [...holes].sort((a, b) => a.hole_number - b.hole_number);
  if (!sorted.length) return null;
  return (
    <div style={{ display: "flex", gap: 3, height: 28, alignItems: "flex-end", width: "100%" }}>
      {sorted.map((h) => {
        const key = getScoreKey(h.strokes, h.par_played);
        const heightPct = scoreBarHeightPct(h.strokes, h.par_played);
        return (
          <div
            key={h.hole_number}
            style={{
              flex: 1,
              height: `${heightPct}%`,
              borderRadius: "2px 2px 0 0",
              background: scoreColors[key] ?? "#9ca3af",
              opacity: key === "par" ? 0.35 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Solid mini strip (for rounds without per-hole data) ──────────────────────
function SolidMiniStrip({ toPar }: { toPar: number | null }) {
  const color = toPar == null ? "#9ca3af" : toPar <= 0 ? "#059669" : toPar <= 14 ? "#f87171" : "#60a5fa";
  return <div style={{ width: 78, height: 16, borderRadius: 2, background: color, opacity: 0.7 }} />;
}

// ─── Benchmark bar (short game) ───────────────────────────────────────────────
function BenchmarkBar({ value, tour }: { value: number | null; tour: number }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div style={{ position: "relative", height: 6, background: "#e5e7eb", borderRadius: 99, marginTop: 6, marginBottom: 4 }}>
      <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${pct}%`, background: PRIMARY, borderRadius: 99 }} />
      <div style={{ position: "absolute", top: -2, left: `${tour}%`, width: 2, height: 10, background: TICK, borderRadius: 99 }} />
    </div>
  );
}

// ─── Interactive score / HCP trend chart — KEEP UNCHANGED ─────────────────────
function MobileScoreTrend({
  dualData,
  scoreColor,
  handicapColor,
}: {
  dualData: DualTrendPoint[];
  scoreColor: string;
  handicapColor: string;
}) {
  const [view, setView] = useState<"score" | "hcp">("score");
  const [selected, setSelected] = useState<{ point: DualTrendPoint; idx: number } | null>(null);

  const W = 320;
  const H = 210;
  const PAD = { top: 14, right: 14, bottom: 32, left: 44 };
  const color = view === "score" ? scoreColor : handicapColor;

  const valid = dualData.filter((d) =>
    view === "score" ? d.total_score != null : d.handicap_index != null,
  );

  if (valid.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400 py-12">
        Not enough data yet
      </div>
    );
  }

  const xScale = scaleLinear()
    .domain([0, dualData.length - 1])
    .range([PAD.left, W - PAD.right]);

  const nums = valid.map((d) => (view === "score" ? d.total_score! : d.handicap_index!));
  const minV = Math.min(...nums);
  const maxV = Math.max(...nums);
  const yScale = scaleLinear()
    .domain([minV - 5, maxV + 5])
    .range([H - PAD.bottom, PAD.top]);

  const getValue = (d: DualTrendPoint) =>
    view === "score" ? d.total_score : d.handicap_index;

  const lineFn = line<DualTrendPoint>()
    .defined((d) => getValue(d) != null)
    .x((_, i) => xScale(i))
    .y((d) => yScale(getValue(d)!))
    .curve(curveMonotoneX);

  const areaFn = area<DualTrendPoint>()
    .defined((d) => getValue(d) != null)
    .x((_, i) => xScale(i))
    .y0(H - PAD.bottom)
    .y1((d) => yScale(getValue(d)!))
    .curve(curveMonotoneX);

  const pathD = lineFn(dualData) ?? "";
  const areaD = areaFn(dualData) ?? "";
  const gradId = `mobileAreaGrad_${view}`;

  const yTicks = yScale.ticks(5);
  const step = Math.max(1, Math.floor((dualData.length - 1) / 4));
  const xTickIdxs = Array.from(
    { length: Math.ceil(dualData.length / step) },
    (_, i) => i * step,
  ).filter((i) => i < dualData.length);
  const barW = Math.max(4, Math.min(14, (W - PAD.left - PAD.right) / dualData.length - 2));
  const baseline = H - PAD.bottom;

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const idx = Math.max(0, Math.min(dualData.length - 1, Math.round(xScale.invert(svgX))));
    const point = dualData[idx];
    if (point) setSelected({ point, idx });
  };

  const selValue = selected ? getValue(selected.point) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-800">Score History</div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(["score", "hcp"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { setView(v); setSelected(null); }}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                view === v ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"
              }`}
            >
              {v === "score" ? "Score" : "HCP"}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && selValue != null && (
          <motion.div
            key={selected.idx}
            className="mb-3 px-3 py-2.5 bg-gray-50 rounded-xl text-xs flex items-start justify-between gap-2"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">Round {selected.point.round_index}</div>
              {selected.point.course_name && (
                <div className="text-gray-400 truncate mt-0.5">{selected.point.course_name}</div>
              )}
            </div>
            <div className="flex items-start gap-3 shrink-0">
              <div className="text-right">
                {view === "score" && (
                  <>
                    <div className="font-bold text-gray-900 text-sm tabular-nums">{selValue}</div>
                    {selected.point.to_par != null && (
                      <div className="text-[11px] font-semibold" style={{ color: getDotColor(selected.point.to_par) }}>
                        {selected.point.to_par > 0 ? `+${selected.point.to_par}` : selected.point.to_par}
                      </div>
                    )}
                  </>
                )}
                {view === "hcp" && (
                  <div className="font-bold text-sm tabular-nums" style={{ color }}>
                    {formatHI(selValue)}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-gray-300 hover:text-gray-500 mt-0.5"
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="select-none">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          overflow="visible"
          onPointerDown={handlePointerDown}
          style={{ touchAction: "pan-y", userSelect: "none" }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.12} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={yScale(v)} y2={yScale(v)} stroke="#d1d5db" strokeWidth={1} />
              <text
                x={PAD.left - 7} y={yScale(v) + 4}
                textAnchor="end" fontSize={11} fontWeight="bold" fill="#6b7280"
                paintOrder="stroke" stroke="white" strokeWidth={4} strokeLinejoin="round"
              >
                {view === "hcp" ? formatHI(v) : v}
              </text>
            </g>
          ))}

          <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#d1d5db" strokeWidth={1} />

          {xTickIdxs.map((i) => (
            <text key={i} x={xScale(i)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#6b7280">
              {i + 1}
            </text>
          ))}

          {view === "score" && dualData.map((d, i) => {
            if (d.total_score == null) return null;
            const barTop = yScale(d.total_score);
            const barHeight = baseline - barTop;
            if (barHeight <= 0) return null;
            return (
              <rect
                key={`bar-${i}`}
                x={xScale(i) - barW / 2}
                y={barTop}
                width={barW}
                height={barHeight}
                fill={getBarColor(d)}
                fillOpacity={0.6}
                rx={2}
              />
            );
          })}

          {selected && (
            <line
              x1={xScale(selected.idx)} x2={xScale(selected.idx)}
              y1={PAD.top} y2={H - PAD.bottom}
              stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3 3"
            />
          )}

          <motion.path
            key={`area-${view}`}
            d={areaD}
            fill={`url(#${gradId})`}
            stroke="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />

          <motion.path
            key={`line-${view}`}
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />

          {dualData.map((d, i) => {
            const val = getValue(d);
            if (val == null) return null;
            const cx = xScale(i);
            const cy = yScale(val);
            const isSel = selected?.idx === i;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={18} fill="transparent" />
                <motion.circle
                  cx={cx} cy={cy}
                  r={isSel ? 5.5 : 3.5}
                  fill={view === "score" ? getDotColor(d.to_par) : color}
                  stroke="white"
                  strokeWidth={isSel ? 2 : 1.5}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.9 + Math.min(i * 0.04, 0.8), duration: 0.25, ease: "backOut" }}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface MobileDashboardProps {
  data: DashboardData;
  trends: AnalyticsData | null;
  user: { name?: string | null; scoring_goal?: number | null } | null;
  goalReport: GoalReport | null;
  dualData: DualTrendPoint[];
  last20ScoringAvg: number | null;
  l5ScoringAvg: number | null;
  handicapDelta: number | null;
  l20ScoreMix: ScoreDistItem[];
  girPct: number;
  scramblingPct: number | null;
  upAndDownPct: number | null;
  putts: number;
  scoreColors: Record<string, string>;
  scoreLineColor: string;
  handicapLineColor: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MobileDashboard({
  data,
  trends,
  user,
  goalReport,
  dualData,
  last20ScoringAvg,
  l5ScoringAvg,
  handicapDelta,
  l20ScoreMix,
  girPct,
  scramblingPct,
  upAndDownPct,
  putts,
  scoreColors,
  scoreLineColor,
  handicapLineColor,
}: MobileDashboardProps) {
  const navigate = useNavigate();
  const firstName = user?.name?.split(" ")[0] ?? "Golfer";
  const lastRound = data.recent_rounds[0] ?? null;
  const recentRounds = data.recent_rounds.slice(0, 3);

  // Fetch per-hole data for micro-bars (mobile-only, lazy)
  const round0Id = data.recent_rounds[0]?.id ?? null;
  const round1Id = data.recent_rounds[1]?.id ?? null;
  const round2Id = data.recent_rounds[2]?.id ?? null;
  const { data: r0 } = useQuery({ queryKey: ["round", round0Id], queryFn: () => api.getRound(round0Id!), enabled: !!round0Id });
  const { data: r1 } = useQuery({ queryKey: ["round", round1Id], queryFn: () => api.getRound(round1Id!), enabled: !!round1Id });
  const { data: r2 } = useQuery({ queryKey: ["round", round2Id], queryFn: () => api.getRound(round2Id!), enabled: !!round2Id });
  type RecentHole = { hole_number: number; strokes?: number | null; par_played?: number | null };
  const toHoles = (d: typeof r0): RecentHole[] => (d?.hole_scores ?? []) as RecentHole[];
  const recentRoundHoles: RecentHole[][] = [toHoles(r0), toHoles(r1), toHoles(r2)];
  const lastRoundHoles = recentRoundHoles[0];

  // Top strip date
  const now = new Date();
  const dayLabel = now.toLocaleDateString("en-US", { weekday: "short" });
  const dateLabel = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Handicap delta display
  const hiDeltaText = handicapDelta != null && Math.abs(handicapDelta) >= 0.1
    ? `${handicapDelta < 0 ? "↓" : "↑"} ${Math.abs(handicapDelta).toFixed(1)}`
    : null;
  const hiDeltaColor = handicapDelta != null && handicapDelta < 0 ? "#059669" : "#f87171";

  // Scoring avg delta: L20 avg vs most-recent-5 avg
  const scoreDelta = last20ScoringAvg != null && l5ScoringAvg != null
    ? last20ScoringAvg - l5ScoringAvg   // positive = L5 is lower = improving
    : null;
  const scoreDeltaText = scoreDelta != null && Math.abs(scoreDelta) >= 0.1
    ? `${scoreDelta > 0 ? "↓" : "↑"} ${Math.abs(scoreDelta).toFixed(1)} vs L5`
    : null;
  const scoreDeltaImproving = scoreDelta != null && scoreDelta > 0;  // L5 lower than L20 = improving

  // Score mix legend groups
  const birdiesPlusPct = (l20ScoreMix.find((d) => d.name === "eagle")?.value ?? 0)
    + (l20ScoreMix.find((d) => d.name === "birdie")?.value ?? 0);
  const parPct         = l20ScoreMix.find((d) => d.name === "par")?.value ?? 0;
  const bogeyPct       = l20ScoreMix.find((d) => d.name === "bogey")?.value ?? 0;
  const doublePct      = l20ScoreMix.find((d) => d.name === "double_bogey")?.value ?? 0;
  const triplePlusPct  = (l20ScoreMix.find((d) => d.name === "triple_bogey")?.value ?? 0)
    + (l20ScoreMix.find((d) => d.name === "quad_bogey")?.value ?? 0);

  const legendItems = [
    { label: "Birdie+", pct: birdiesPlusPct, color: scoreColors.birdie },
    { label: "Par",     pct: parPct,         color: scoreColors.par },
    { label: "Bogey",   pct: bogeyPct,       color: scoreColors.bogey },
    { label: "Dbl",     pct: doublePct,      color: scoreColors.double_bogey },
    { label: "Tpl+",    pct: triplePlusPct,  color: scoreColors.triple_bogey },
  ];

  const totalL20Holes = (trends?.score_type_distribution ?? []).reduce(
    (s, r) => s + r.holes_counted, 0,
  );

  // Last round footer chips
  const footerChips = (() => {
    if (!lastRoundHoles.length) return [];
    const counts: Partial<Record<HoleKey, number>> = {};
    for (const h of lastRoundHoles) {
      const k = getScoreKey(h.strokes, h.par_played);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const items: { label: string; count: number; color: string }[] = [];
    const birdiesPlus = (counts.eagle ?? 0) + (counts.birdie ?? 0);
    if (birdiesPlus > 0) items.push({ label: "Birdie+", count: birdiesPlus, color: scoreColors.birdie ?? "#059669" });
    if (counts.par)          items.push({ label: "Par",    count: counts.par,          color: scoreColors.par     ?? "#9ca3af" });
    if (counts.bogey)        items.push({ label: "Bogey",  count: counts.bogey,        color: scoreColors.bogey   ?? "#f87171" });
    if (counts.double_bogey) items.push({ label: "Double", count: counts.double_bogey, color: scoreColors.double_bogey ?? "#60a5fa" });
    return items;
  })();

  // Goal progress
  const goalProgress = (() => {
    if (!user?.scoring_goal) return null;
    const current = goalReport?.scoring_average ?? last20ScoringAvg;
    if (current == null) return null;
    if (goalReport?.on_track) return 100;
    const validScores = dualData.filter((d) => d.total_score != null);
    if (!validScores.length) return null;
    const startAvg = validScores[0].total_score!;
    const goalTarget = user.scoring_goal;
    const range = startAvg - goalTarget;
    if (range <= 0) return 100;
    return Math.min(100, Math.max(0, ((startAvg - current) / range) * 100));
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8 }}>

      {/* ── 1. Top Strip ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 4px 6px" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: "1.3px", textTransform: "uppercase", color: MUTED, marginBottom: 3 }}>
            {dayLabel} · {dateLabel}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", color: INK, lineHeight: 1 }}>
            Hi {firstName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: MUTED, marginBottom: 2 }}>
            Handicap
          </div>
          <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: INK, lineHeight: 1 }}>
            {formatHI(data.handicap_index)}
          </div>
          {hiDeltaText && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: hiDeltaColor, whiteSpace: "nowrap", marginTop: 2 }}>
              {hiDeltaText}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Hero Card ─────────────────────────────────────────────────────── */}
      <div style={{
        background: `radial-gradient(ellipse at 90% 10%, rgba(45,122,58,0.07) 0%, transparent 55%), #f9fafb`,
        border: `1px solid ${LINE}`,
        borderRadius: 20,
        padding: "18px 18px 16px",
      }}>
        {/* 2a. Label + delta pill */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "1.6px", textTransform: "uppercase", color: MUTED, whiteSpace: "nowrap" }}>
            Scoring Avg · L20
          </div>
          {scoreDeltaText && (
            <div style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 600,
              color: scoreDeltaImproving ? "#059669" : "#f87171",
              background: scoreDeltaImproving ? "rgba(5,150,105,0.1)" : "rgba(248,113,113,0.1)",
              padding: "3px 8px", borderRadius: 99, whiteSpace: "nowrap",
            }}>
              {scoreDeltaText}
            </div>
          )}
        </div>

        {/* 2b. Big number + sparkline */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: SANS, fontSize: 64, fontWeight: 700, letterSpacing: "-2.4px", lineHeight: 1, color: INK }}>
            {last20ScoringAvg != null ? last20ScoringAvg.toFixed(1) : "—"}
          </div>
          <HeroSparkline data={dualData} />
        </div>

        {/* 2c. Score Mix bar */}
        {l20ScoreMix.some((d) => d.value > 0) && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: MUTED }}>
                Score Mix · L20
              </div>
              {totalL20Holes > 0 && (
                <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, whiteSpace: "nowrap" }}>
                  {totalL20Holes} holes
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 2, height: 9, borderRadius: 3, overflow: "hidden" }}>
              {l20ScoreMix.filter((d) => d.value > 0.5).map((d) => (
                <div key={d.name} style={{ flex: d.value, background: scoreColors[d.name] ?? d.color, minWidth: 2 }} />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", marginTop: 8 }}>
              {legendItems.map((item) => (
                <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: INK }}>
                    {item.pct.toFixed(0)}%
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1, background: item.color, flexShrink: 0 }} />
                    <div style={{ fontFamily: SANS, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: MUTED }}>
                      {item.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2d. Metadata strip */}
        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 12, marginTop: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", textAlign: "center" }}>
            {([
              { label: "BEST",   value: data.best_round?.toString() ?? "—" },
              { label: "ROUNDS", value: data.total_rounds?.toString() ?? "—" },
              { label: "PUTTS",  value: putts > 0 ? putts.toFixed(1) : "—" },
              { label: "GIR",    value: girPct > 0 ? `${girPct.toFixed(0)}%` : "—" },
            ] as const).map(({ label, value }) => (
              <div key={label} style={{ padding: "0 2px" }}>
                <div style={{ fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: MUTED, marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: INK, lineHeight: 1 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Last Round Ticket ──────────────────────────────────────────────── */}
      {lastRound && (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "16px 18px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
              <div style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: MUTED, letterSpacing: "1px", marginBottom: 4 }}>
                Last Round
              </div>
              <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, color: INK, letterSpacing: "-0.3px", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lastRound.course_name ? formatCourseName(lastRound.course_name) : "Unknown course"}
              </div>
              <div style={{ fontFamily: SANS, fontSize: 12, color: MUTED, whiteSpace: "nowrap", marginTop: 3, display: "flex", alignItems: "center" }}>
                {fmtDate(lastRound.date)}
                {lastRound.tee_box && <><Dot />{lastRound.tee_box}</>}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 38, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1, color: INK }}>
                {lastRound.total_score ?? "—"}
              </div>
              {lastRound.to_par != null && (
                <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: lastRound.to_par > 0 ? "#f87171" : "#059669" }}>
                  {lastRound.to_par > 0 ? `+${lastRound.to_par}` : lastRound.to_par === 0 ? "E" : lastRound.to_par}
                </div>
              )}
            </div>
          </div>

          {lastRoundHoles.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <MicroBars holes={lastRoundHoles} scoreColors={scoreColors} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                {["1", "9", "18"].map((n) => (
                  <div key={n} style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>{n}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: `1px dashed ${LINE}`, paddingTop: 12, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {footerChips.map((chip) => (
                <div key={chip.label} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: SANS, fontSize: 10, color: MUTED }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: chip.color, flexShrink: 0 }} />
                  <span>{chip.count} {chip.label}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate(`/rounds/${lastRound.id}`)}
              style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: PRIMARY, background: "none", border: "none", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
            >
              Open card →
            </button>
          </div>
        </div>
      )}

      {/* ── 4. Inline Goal Row ────────────────────────────────────────────────── */}
      {user?.scoring_goal != null && goalProgress != null && (
        <div style={{ padding: "6px 6px 0" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: INK }}>Goal</span>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: PRIMARY, marginLeft: 4 }}>
              Break {user.scoring_goal + 1}
            </span>
          </div>
          <div style={{ height: 5, background: "#e5e7eb", borderRadius: 99, position: "relative", overflow: "visible" }}>
            <div style={{ height: "100%", width: `${goalProgress}%`, background: PRIMARY, borderRadius: 99 }} />
            <div style={{
              position: "absolute",
              top: -3, left: `${goalProgress}%`,
              width: 2, height: 11,
              background: TICK, borderRadius: 99,
              transform: "translateX(-50%)",
            }} />
          </div>
        </div>
      )}

      {/* ── 5. Score History — KEEP EXISTING ─────────────────────────────────── */}
      <div style={{ borderRadius: 16, border: `1px solid ${LINE}`, padding: 16, background: "linear-gradient(180deg, rgba(238,247,240,0.4) 0%, white 50%)" }}>
        <MobileScoreTrend
          dualData={dualData}
          scoreColor={scoreLineColor}
          handicapColor={handicapLineColor}
        />
      </div>

      {/* ── 6. Short Game Card ───────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "16px 18px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: INK }}>Short Game</span>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, color: MUTED }}>L5</span>
          </div>
          <Link to="/the-lab" style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: PRIMARY, textDecoration: "none" }}>
            Open Lab →
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {([
            { label: "Scrambling", value: scramblingPct, tour: 57 },
            { label: "Up & Down",  value: upAndDownPct,  tour: 50 },
          ] as const).map(({ label, value, tour }) => (
            <div key={label}>
              <div style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "1.3px", textTransform: "uppercase", color: MUTED, marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, letterSpacing: "-0.5px", color: INK, lineHeight: 1 }}>
                {value != null ? value.toFixed(0) : "—"}
                <span style={{ fontSize: 16, fontWeight: 500, color: MUTED }}>%</span>
              </div>
              <BenchmarkBar value={value} tour={tour} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>You {value != null ? `${value.toFixed(0)}%` : "—"}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>Tour {tour}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 7. Recent Rounds Card ────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "16px 4px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px", marginBottom: 4 }}>
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: INK }}>Recent Rounds</span>
          <Link to="/rounds" style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: PRIMARY, textDecoration: "none" }}>
            View all →
          </Link>
        </div>

        {recentRounds.length === 0 && (
          <div style={{ padding: "16px 14px", fontFamily: SANS, fontSize: 14, color: MUTED }}>No rounds yet</div>
        )}

        {recentRounds.map((r, idx) => {
          const accentColor = r.to_par == null ? "#9ca3af"
            : r.to_par <= 0  ? "#059669"
            : r.to_par <= 14 ? "#f87171"
            : "#60a5fa";
          const isLast = idx === recentRounds.length - 1;

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate(`/rounds/${r.id}`)}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "52px 1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "12px 14px 12px 10px",
                borderBottom: isLast ? "none" : `1px solid ${LINE}`,
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                position: "relative",
                background: "none",
                borderRadius: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: 99, background: accentColor }} />
              <div>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: INK, lineHeight: 1 }}>
                  {r.total_score ?? "—"}
                </div>
                {r.to_par != null && (
                  <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: r.to_par > 0 ? "#f87171" : "#059669" }}>
                    {r.to_par > 0 ? `+${r.to_par}` : r.to_par === 0 ? "E" : r.to_par}
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, letterSpacing: "-0.2px", color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.course_name ? formatCourseName(r.course_name) : "Unknown course"}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: MUTED, whiteSpace: "nowrap", marginTop: 2, display: "flex", alignItems: "center" }}>
                  {fmtDate(r.date)}
                  {r.tee_box && <><Dot />{r.tee_box}</>}
                </div>
              </div>
              {(() => {
                const holes = recentRoundHoles[idx] ?? [];
                return holes.length > 0 ? (
                  <div style={{ width: 78, height: 16, display: "flex", gap: 1.5, alignItems: "flex-end", flexShrink: 0 }}>
                    {[...holes].sort((a, b) => a.hole_number - b.hole_number).map((h) => {
                      const key = getScoreKey(h.strokes, h.par_played);
                      return (
                        <div
                          key={h.hole_number}
                          style={{
                            flex: 1,
                            height: "100%",
                            borderRadius: 1.5,
                            background: scoreColors[key] ?? "#9ca3af",
                            opacity: key === "par" ? 0.35 : 1,
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ flexShrink: 0 }}>
                    <SolidMiniStrip toPar={r.to_par} />
                  </div>
                );
              })()}
            </button>
          );
        })}
      </div>

    </div>
  );
}
