// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fmt = (v: any, name: any, props: any) => any;

import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import {
  PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { UserRadarChart } from "@/components/analytics/UserRadarChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { ScrollSection } from "@/components/analytics/ScrollSection";
import { SVGHandicapTrend } from "@/components/analytics/SVGHandicapTrend";
import { SCORE_LABELS } from "@/lib/colors";
import type { CareerViewModel, TimeWindow } from "@/hooks/useCareerViewModel";

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 12,
  border: "1px solid #f1f5f9",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  background: "rgba(255,255,255,0.97)",
};

function isWithinLastDays(dateStr: string, days: number): boolean {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return false;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return parsed >= cutoff;
}

function ChartCard({
  title, subtitle, children, className,
}: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-gray-200/50 ${className ?? ""}`}>
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value ?? "—"}</div>
    </div>
  );
}

function MilestoneBar({
  label, achieved, achievedColor = "var(--color-primary)", roundId,
}: {
  label: string; achieved: boolean; achievedColor?: string; roundId?: string | null;
}) {
  return (
    <div className="group flex items-center gap-3">
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: achieved ? achievedColor : "#e5e7eb" }}
      />
      <div className={`text-sm ${achieved ? "text-gray-900 font-medium" : "text-gray-400"}`}>{label}</div>
      {achieved && (
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: achievedColor }}>Achieved</span>
          {roundId && (
            <Link
              to={`/rounds/${roundId}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
            >
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function CareerDesktopLayout(vm: CareerViewModel) {
  const {
    data, timeWindow, setTimeWindow,
    donutData, recordRows, scoreBreaksAbove70, scoreBreaks70AndBelow,
    totalHoles, gaugeData, hiColor, hiDisplay,
    trendPrimary, successColor, neutralColor, gridColor, mutedFill, scoreColors,
  } = vm;

  if (!data) return null;

  const {
    career_totals,
    putting_milestones, gir_milestones, round_milestones, window_days,
  } = data.notable_achievements;

  const w: TimeWindow = timeWindow;

  return (
    <div>
      <div className="mb-6">
        <PageHeader title="Career" subtitle="Player achievement records" scrollThreshold={100} />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-4">Career</h1>
        <div className="flex gap-2">
          {(["lifetime", "one_year"] as TimeWindow[]).map((tw) => (
            <button
              key={tw}
              onClick={() => setTimeWindow(tw)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeWindow === tw
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {tw === "lifetime" ? "Lifetime" : `Last ${window_days} Days`}
            </button>
          ))}
        </div>
      </div>

      <ScrollSection>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

          <ChartCard
            title="Handicap Index Trend"
            subtitle={data.kpis.handicap_index != null ? `Current: ${hiDisplay}` : undefined}
            className="xl:col-span-3"
          >
            <SVGHandicapTrend
              data={data.handicap_trend}
              color={trendPrimary}
              gridColor={gridColor}
              height={240}
            />
          </ChartCard>

          <ChartCard title="Career Score Mix">
            <div className="relative">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={74}
                    stroke="none"
                    paddingAngle={2}
                  >
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={scoreColors[d.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={((v: number, name: string) => [`${v.toFixed(1)}%`, SCORE_LABELS[name] ?? name]) as Fmt}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-2xl font-bold text-gray-900">{totalHoles}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">holes</div>
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: scoreColors[d.name] }} />
                  <span className="text-xs text-gray-500 flex-1">{SCORE_LABELS[d.name] ?? d.name}</span>
                  <span className="text-xs font-semibold text-gray-700 tabular-nums">{d.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Player Profile">
            <UserRadarChart
              kpis={data.kpis}
              scoringByPar={data.scoring_by_par}
              height={220}
              outerRadius={80}
              primaryColor={trendPrimary}
              gridColor={gridColor}
              axisColor={neutralColor}
            />
          </ChartCard>

          <ChartCard title="Round Records" className="xl:col-span-2">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[10px] uppercase tracking-widest text-gray-400 font-semibold pb-2 w-[30%]">Record</th>
                    <th className="text-right text-[10px] uppercase tracking-widest text-gray-400 font-semibold pb-2 pr-4 w-[15%]">Value</th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-gray-400 font-semibold pb-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recordRows.map((row) => (
                    <tr key={row.label} className="group">
                      <td className="py-2.5 text-gray-600">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right font-bold text-gray-900">{row.value ?? "—"}</td>
                      <td className="py-2.5 text-xs text-gray-400 truncate max-w-[160px]">{row.meta ?? "—"}</td>
                      <td className="py-2.5 w-5 text-right">
                        {row.roundId && (
                          <Link
                            to={`/rounds/${row.roundId}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 inline-block"
                          >
                            <ChevronRight size={14} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard title="Handicap Index">
            <div className="relative" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={70}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={hiColor} />
                    <Cell fill={mutedFill} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center pointer-events-none">
                <div className="text-2xl font-bold text-gray-900">{hiDisplay}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">HCP Index</div>
              </div>
            </div>
          </ChartCard>

          <ChartCard
            title={w === "lifetime" ? "Career Totals" : "Year Totals"}
            className="xl:col-span-2"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {w === "lifetime" ? (
                <>
                  <StatTile label="Rounds" value={career_totals.lifetime.total_rounds_played} />
                  <StatTile label="Birdies" value={career_totals.lifetime.total_birdies} />
                  <StatTile label="Eagles" value={career_totals.lifetime.total_eagles} />
                  <StatTile label="Pars" value={career_totals.lifetime.total_pars} />
                  <StatTile label="Bogeys" value={career_totals.lifetime.total_bogeys} />
                  <StatTile label="GIR" value={career_totals.lifetime.total_gir} />
                  <StatTile label="3-Putts" value={career_totals.lifetime.total_3_putts} />
                  <StatTile label="Hole-in-Ones" value={career_totals.lifetime.total_hole_in_ones} />
                  <StatTile label="Doubles" value={career_totals.lifetime.total_double_bogeys} />
                </>
              ) : (
                <>
                  <StatTile label="Rounds" value={career_totals.one_year.rounds_played} />
                  <StatTile label="Birdies" value={career_totals.one_year.birdies} />
                  <StatTile label="Eagles" value={career_totals.one_year.eagles} />
                  <StatTile label="GIR" value={career_totals.one_year.gir} />
                  <StatTile label="3-Putts" value={career_totals.one_year.three_putts} />
                  <StatTile label="Hole-in-Ones" value={career_totals.one_year.hole_in_ones} />
                  <StatTile label="Doubles" value={career_totals.one_year.double_bogeys} />
                  <StatTile label="Triples" value={career_totals.one_year.triple_bogeys} />
                  <StatTile label="Quad+" value={career_totals.one_year.quad_bogeys_plus} />
                </>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Career Milestones" className="xl:col-span-2">
            {w === "lifetime" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {scoreBreaksAbove70.map((row) => (
                  <MilestoneBar
                    key={row.threshold}
                    label={`Break ${row.threshold}`}
                    achieved={row.achievement != null}
                    achievedColor={successColor}
                    roundId={row.achievement?.round_id}
                  />
                ))}
                <MilestoneBar
                  label="Round Under Par"
                  achieved={round_milestones.lifetime.first_round_under_par != null}
                  achievedColor={successColor}
                  roundId={round_milestones.lifetime.first_round_under_par?.round_id}
                />
                {scoreBreaks70AndBelow.map((row) => (
                  <MilestoneBar
                    key={row.threshold}
                    label={`Break ${row.threshold}`}
                    achieved={row.achievement != null}
                    achievedColor={successColor}
                    roundId={row.achievement?.round_id}
                  />
                ))}
                <MilestoneBar
                  label="First Eagle"
                  achieved={round_milestones.lifetime.first_eagle != null}
                  achievedColor={successColor}
                  roundId={round_milestones.lifetime.first_eagle?.round_id}
                />
                <MilestoneBar
                  label="Hole-in-One"
                  achieved={round_milestones.lifetime.first_hole_in_one != null}
                  achievedColor={successColor}
                  roundId={round_milestones.lifetime.first_hole_in_one?.round_id}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-gray-500 mb-3">
                  {round_milestones.one_year.new_personal_records_achieved_count} new personal records in the last {window_days} days.
                </div>
                {round_milestones.one_year.new_personal_records_achieved.map((pr) => (
                  <MilestoneBar key={pr} label={pr} achieved={true} achievedColor={successColor} />
                ))}
                {round_milestones.one_year.new_personal_records_achieved.length === 0 && (
                  <div className="text-sm text-gray-400">No new records yet — keep playing!</div>
                )}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Putting Milestones" className="xl:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              {putting_milestones.lifetime.putt_breaks.map((row) => {
                const achieved =
                  w === "lifetime"
                    ? row.achievement != null
                    : row.achievement != null && isWithinLastDays(row.achievement.date, window_days);
                return (
                  <MilestoneBar
                    key={row.threshold}
                    label={`Break ${row.threshold} Putts`}
                    achieved={achieved}
                    achievedColor={successColor}
                    roundId={row.achievement?.round_id}
                  />
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="GIR Milestones" className="xl:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              {gir_milestones.lifetime.gir_breaks.map((row) => {
                const achieved =
                  w === "lifetime"
                    ? row.achievement != null
                    : row.achievement != null && isWithinLastDays(row.achievement.date, window_days);
                return (
                  <MilestoneBar
                    key={row.threshold}
                    label={`${row.threshold}/18 GIR`}
                    achieved={achieved}
                    achievedColor={successColor}
                    roundId={row.achievement?.round_id}
                  />
                );
              })}
            </div>
          </ChartCard>

        </div>
      </ScrollSection>
    </div>
  );
}
