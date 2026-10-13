import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  HoleScoreBars,
  SVGScoreHandicapTrend,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { ScoringHeroCard } from "./components/ScoringHeroCard";
import { formatHandicapIndex } from "@/domain/handicap";
import type { DashboardPageViewModel } from "./useDashboardPageViewModel";
import {
  deltaColor,
  deltaText,
  firstNameOf,
  goalTargetLabel,
  greetingDateLabel,
  lastRoundChips,
  pctLabel,
  scoreDelta,
  toRoundRow,
} from "./present";

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK     = "#131613";
const MUTED   = "#6b7765";
const LINE    = "#e4e9e1";
const TICK    = "#1b2b1e";
const TRACK   = "#e5e7eb";
const PRIMARY = "#2d7a3a";
const SANS    = '"Inter", system-ui, -apple-system, sans-serif';
const MONO    = '"Inter", system-ui, -apple-system, sans-serif';

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

// ─── Solid mini strip (for rounds without per-hole data) ──────────────────────
function SolidMiniStrip({ color }: { color: string }) {
  return <div style={{ width: 78, height: 16, borderRadius: 2, background: color, opacity: 0.7 }} />;
}

// ─── Benchmark bar (short game) ───────────────────────────────────────────────
function BenchmarkBar({ value, tour }: { value: number | null; tour: number }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div style={{ position: "relative", height: 6, background: TRACK, borderRadius: 99, marginTop: 6, marginBottom: 4 }}>
      <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${pct}%`, background: PRIMARY, borderRadius: 99 }} />
      <div style={{ position: "absolute", top: -2, left: `${tour}%`, width: 2, height: 10, background: TICK, borderRadius: 99 }} />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
export function MobileDashboard({ vm }: { vm: DashboardPageViewModel }) {
  const navigate = useNavigate();
  const {
    data,
    trend,
    recentScores,
    last20ScoringAvg,
    l5ScoringAvg,
    l20ScoreMix,
    mixHoleCount,
    scramblingPct,
    upAndDownPct,
    handicapDelta,
    openHandicapSheet,
    trendView,
    setTrendView,
    recentRounds,
    goal,
  } = vm;

  if (!data) return null;

  const hiDeltaText = deltaText(handicapDelta);
  const lastRound = recentRounds[0] ? toRoundRow(recentRounds[0]) : null;
  const recentRoundRows = recentRounds.map(toRoundRow);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8 }}>

      {/* ── 1. Top Strip ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 4px 6px" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: "1.3px", textTransform: "uppercase", color: MUTED, marginBottom: 3 }}>
            {greetingDateLabel()}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", color: INK, lineHeight: 1 }}>
            Hi {firstNameOf(vm.user)}
          </div>
        </div>
        <button
          type="button"
          onClick={openHandicapSheet}
          style={{ textAlign: "right", background: "none", border: "none", cursor: "pointer", padding: "4px 0", borderRadius: 8 }}
        >
          <div style={{ fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: MUTED, marginBottom: 2 }}>
            Handicap
          </div>
          <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: INK, lineHeight: 1 }}>
            {formatHandicapIndex(data.handicap_index)}
          </div>
          {hiDeltaText && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: deltaColor(handicapDelta != null && handicapDelta < 0), whiteSpace: "nowrap", marginTop: 2 }}>
              {hiDeltaText}
            </div>
          )}
        </button>
      </div>

      {/* ── 2. Hero Card ─────────────────────────────────────────────────────── */}
      <ScoringHeroCard
        average={last20ScoringAvg}
        change={scoreDelta(last20ScoringAvg, l5ScoringAvg)}
        recentScores={recentScores}
        mix={l20ScoreMix}
        mixHoles={mixHoleCount}
        bestRound={data.best_round ?? null}
        totalRounds={data.total_rounds}
        putts={vm.putts}
        girPct={vm.girPct}
      />

      {/* ── 3. Last Round Ticket ──────────────────────────────────────────────── */}
      {lastRound && (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "16px 18px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
              <div style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: MUTED, letterSpacing: "1px", marginBottom: 4 }}>
                Last Round
              </div>
              <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, color: INK, letterSpacing: "-0.3px", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lastRound.courseLabel}
              </div>
              <div style={{ fontFamily: SANS, fontSize: 12, color: MUTED, whiteSpace: "nowrap", marginTop: 3, display: "flex", alignItems: "center" }}>
                {lastRound.dateLabel}
                {lastRound.teeBox && <><Dot />{lastRound.teeBox}</>}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 38, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1, color: INK }}>
                {lastRound.scoreLabel}
              </div>
              {lastRound.toParLabel && (
                <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: lastRound.toParColor }}>
                  {lastRound.toParLabel}
                </div>
              )}
            </div>
          </div>

          {lastRound.holes.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <HoleScoreBars holes={recentRounds[0].holes} variant="profile" />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                {["1", "9", "18"].map((n) => (
                  <div key={n} style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>{n}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: `1px dashed ${LINE}`, paddingTop: 12, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {lastRoundChips(recentRounds[0] ?? null).map((chip) => (
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
      {goal?.progressPct != null && (
        <div style={{ padding: "6px 6px 0" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: INK }}>Goal</span>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: PRIMARY, marginLeft: 4 }}>
              {goalTargetLabel(goal.target)}
            </span>
          </div>
          <div style={{ height: 5, background: TRACK, borderRadius: 99, position: "relative", overflow: "visible" }}>
            <div style={{ height: "100%", width: `${goal.progressPct}%`, background: PRIMARY, borderRadius: 99 }} />
            <div style={{
              position: "absolute",
              top: -3, left: `${goal.progressPct}%`,
              width: 2, height: 11,
              background: TICK, borderRadius: 99,
              transform: "translateX(-50%)",
            }} />
          </div>
        </div>
      )}

      {/* ── 5. Score History ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Score History</CardTitle>
          <CardAction>
            <ToggleGroup
              aria-label="Trend line"
              variant="outline"
              size="sm"
              spacing={0}
              value={[trendView]}
              onValueChange={(values) => {
                // Tapping the pressed item would empty the group; the card always shows one line.
                if (values[0] === "score" || values[0] === "handicap") setTrendView(values[0]);
              }}
            >
              <ToggleGroupItem value="score">Score</ToggleGroupItem>
              <ToggleGroupItem value="handicap">HCP</ToggleGroupItem>
            </ToggleGroup>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SVGScoreHandicapTrend data={trend} series={trendView} compact />
        </CardContent>
      </Card>

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
                {value != null && <span style={{ fontSize: 16, fontWeight: 500, color: MUTED }}>%</span>}
              </div>
              <BenchmarkBar value={value} tour={tour} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>You {pctLabel(value)}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>Tour {tour}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Handicap Breakdown Sheet ─────────────────────────────────────────── */}
      {/* ── 7. Recent Rounds Card ────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "16px 4px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px", marginBottom: 4 }}>
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: INK }}>Recent Rounds</span>
          <Link to="/rounds" style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: PRIMARY, textDecoration: "none" }}>
            View all →
          </Link>
        </div>

        {recentRoundRows.length === 0 && (
          <div style={{ padding: "16px 14px", fontFamily: SANS, fontSize: 14, color: MUTED }}>No rounds yet</div>
        )}

        {recentRoundRows.map((r, idx) => {
          const isLast = idx === recentRoundRows.length - 1;

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
              <div style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: 99, background: r.accentColor }} />
              <div>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: INK, lineHeight: 1 }}>
                  {r.scoreLabel}
                </div>
                {r.toParLabel && (
                  <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: r.toParColor }}>
                    {r.toParLabel}
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, letterSpacing: "-0.2px", color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.courseLabel}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: MUTED, whiteSpace: "nowrap", marginTop: 2, display: "flex", alignItems: "center" }}>
                  {r.dateLabel}
                  {r.teeBox && <><Dot />{r.teeBox}</>}
                </div>
              </div>
              {r.holes.length > 0 ? (
                <div style={{ width: 78, height: 16, display: "flex", gap: 1.5, alignItems: "flex-end", flexShrink: 0 }}>
                  {r.holes.map((h) => (
                    <div
                      key={h.hole}
                      style={{
                        flex: 1,
                        height: "100%",
                        borderRadius: 1.5,
                        background: h.fill,
                        opacity: h.kind === "par" ? 0.35 : 1,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ flexShrink: 0 }}>
                  <SolidMiniStrip color={r.accentColor} />
                </div>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
