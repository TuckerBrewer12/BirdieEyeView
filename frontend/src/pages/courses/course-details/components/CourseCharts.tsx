import { useId, useState, type MouseEvent, type ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import { line, area, curveMonotoneX } from "d3-shape";
import {
  Bar,
  BarChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ToParFigure,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { chartColors, chartLayout, chartTickStyle, chartTooltipStyle, colors, toParFill } from "@/brand/theme";
import { formatRoundDateHistory, formatRoundDateTick } from "@/lib/roundDate";
import type { ChartTabKey, CourseChart, TabItem, TrendPoint } from "../courseDetailModel";
import { ToParBars } from "./ToParBars";

type ScoreTypeRow = Extract<CourseChart, { kind: "scoreType" }>["rows"][number];

const CHART_TITLES: Record<CourseChart["kind"], string> = {
  toPar: "Average Score To Par By Hole",
  scoreType: "Score Type Distribution By Hole",
  gir: "GIR Percentage By Hole",
  putts: "Average Putts By Hole",
  difficulty: "Course Difficulty Profile (Hardest To Easiest)",
  variance: "Score Variance By Hole (Std Dev)",
};

const holeLabel = (hole: number) => `H${hole}`;

type Fmt = (value: unknown, name: unknown, props: unknown) => ReactNode | [ReactNode, string];

const SVG_WIDTH = 560;
const SVG_HEIGHT = 180;
const SVG_PAD = { top: 16, right: 16, bottom: 28, left: 36 };

const SCORE_TYPE_SERIES: {
  key: keyof Omit<ScoreTypeRow, "hole_number" | "sample_size">;
  name: string;
  fill: string;
}[] = [
  { key: "eagle", name: "Eagle+", fill: colors.score.eagle.base },
  { key: "birdie", name: "Birdie", fill: colors.score.birdie.base },
  { key: "par", name: "Par", fill: colors.score.par.base },
  { key: "bogey", name: "Bogey", fill: colors.score.bogey.base },
  { key: "double_bogey", name: "Double", fill: colors.score.double.base },
  { key: "triple_bogey", name: "Triple", fill: colors.score.triple.base },
  { key: "quad_bogey", name: "Quad+", fill: colors.score.quad.base },
];

const AXIS_TICK = { ...chartTickStyle, fill: chartColors.axis };

interface CourseChartsProps {
  charts: CourseChart[];
  selectedCharts: CourseChart[];
  chartTabs: TabItem<ChartTabKey>[];
  chartTab: ChartTabKey;
  onSelectChartTab: (key: string) => void;
}

export function CourseScoreTrend({ data }: { data: TrendPoint[] }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <ScoreTrendChart data={data} />
      </CardContent>
    </Card>
  );
}

function ChartShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-chart">{children}</div>
      </CardContent>
    </Card>
  );
}

function ScoreTrendChart({ data }: { data: TrendPoint[] }) {
  const [hovered, setHovered] = useState<TrendPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const areaId = `course-trend-area-${useId().replace(/:/g, "")}`;

  if (data.length < 2) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">Not enough data</div>
    );
  }

  const scores = data.map((point) => point.score);
  const xSc = scaleLinear().domain([0, data.length - 1]).range([SVG_PAD.left, SVG_WIDTH - SVG_PAD.right]);
  const ySc = scaleLinear()
    .domain([Math.min(...scores) - 3, Math.max(...scores) + 3])
    .range([SVG_HEIGHT - SVG_PAD.bottom, SVG_PAD.top]);
  const lineFn = line<TrendPoint>().x((_, i) => xSc(i)).y((d) => ySc(d.score)).curve(curveMonotoneX);
  const areaFn = area<TrendPoint>()
    .x((_, i) => xSc(i))
    .y0(SVG_HEIGHT - SVG_PAD.bottom)
    .y1((d) => ySc(d.score))
    .curve(curveMonotoneX);
  const pathD = lineFn(data) ?? "";
  const areaD = areaFn(data) ?? "";
  const gridTicks = ySc.ticks(5);

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = (event.clientX - rect.left) * (SVG_WIDTH / rect.width);
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(xSc.invert(svgX))));
    setHovered(data[idx]);
    setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.primary} stopOpacity={0.12} />
            <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        {gridTicks.map((tick) => (
          <line
            key={tick}
            x1={SVG_PAD.left}
            x2={SVG_WIDTH - SVG_PAD.right}
            y1={ySc(tick)}
            y2={ySc(tick)}
            stroke={chartColors.muted}
            strokeWidth={1}
          />
        ))}
        {gridTicks.map((tick) => (
          <text
            key={`l${tick}`}
            x={SVG_PAD.left - 6}
            y={ySc(tick) + 4}
            textAnchor="end"
            fontSize={chartTickStyle.fontSize}
            fill={chartColors.axis}
          >
            {tick}
          </text>
        ))}
        <path d={areaD} fill={`url(#${areaId})`} />
        <path d={pathD} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((point, i) => (
          <circle
            key={point.roundIndex}
            cx={xSc(i)}
            cy={ySc(point.score)}
            r={hovered === point ? 6 : 4}
            fill={toParFill(point.toPar)}
            stroke={colors.card}
            strokeWidth={1.5}
          />
        ))}
        {hovered && (
          <line
            x1={xSc(data.indexOf(hovered))}
            x2={xSc(data.indexOf(hovered))}
            y1={SVG_PAD.top}
            y2={SVG_HEIGHT - SVG_PAD.bottom}
            stroke={chartColors.muted}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
        {data.length <= 12 && data.map((point, i) => formatRoundDateTick(point.date) ? (
          <text
            key={`x${point.roundIndex}`}
            x={xSc(i)}
            y={SVG_HEIGHT - SVG_PAD.bottom + 14}
            textAnchor="middle"
            fontSize={chartTickStyle.fontSize}
            fill={chartColors.axis}
          >
            {formatRoundDateTick(point.date)}
          </text>
        ) : null)}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 min-w-28 rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-card"
          style={{
            left: tooltipPos.x + (tooltipPos.x > 380 ? -145 : 14),
            top: tooltipPos.y - 10,
          }}
        >
          <div className="mb-1 text-meta text-muted-foreground">{formatRoundDateHistory(hovered.date) ?? "—"}</div>
          <div className="text-sm font-bold text-foreground">{hovered.score}</div>
          <ToParFigure toPar={hovered.toPar} />
        </div>
      )}
    </div>
  );
}

function renderChart(card: CourseChart, gradientId: string) {
  switch (card.kind) {
    case "toPar":
    case "difficulty":
      return (
        <BarChart data={card.rows} margin={chartLayout.margin}>
          <XAxis
            dataKey="hole_number"
            tickFormatter={card.kind === "difficulty" ? holeLabel : undefined}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={((value: number) => [Number(value ?? 0).toFixed(2), "Avg to Par"]) as Fmt}
          />
          <ReferenceLine y={0} stroke={chartColors.muted} />
          <ToParBars rows={card.rows} />
        </BarChart>
      );
    case "scoreType":
      return (
        <BarChart data={card.rows} margin={chartLayout.margin}>
          <XAxis dataKey="hole_number" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.sample_size != null ? `${payload[0].payload.sample_size} rounds` : ""}
            formatter={((value: number) => [`${Number(value ?? 0).toFixed(1)}%`, ""]) as Fmt}
          />
          <Legend wrapperStyle={{ fontSize: chartTickStyle.fontSize }} />
          {SCORE_TYPE_SERIES.map((series) => (
            <Bar key={series.key} dataKey={series.key} stackId="a" fill={series.fill} name={series.name} />
          ))}
        </BarChart>
      );
    case "gir":
      return (
        <BarChart data={card.rows} margin={chartLayout.margin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.accent} stopOpacity={1} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="hole_number" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={((value: number) => [`${Number(value ?? 0).toFixed(1)}%`, "GIR %"]) as Fmt}
          />
          <Bar dataKey="gir_percentage" fill={`url(#${gradientId})`} radius={chartLayout.barRadius} />
        </BarChart>
      );
    case "putts":
      return (
        <BarChart data={card.rows} margin={chartLayout.margin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.muted} stopOpacity={1} />
              <stop offset="100%" stopColor={colors.mutedForeground} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="hole_number" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={((value: number) => [Number(value ?? 0).toFixed(2), "Avg putts"]) as Fmt}
          />
          <Bar dataKey="average_putts" fill={`url(#${gradientId})`} radius={chartLayout.barRadius} />
        </BarChart>
      );
    case "variance":
      return (
        <BarChart data={card.rows} margin={chartLayout.margin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.score.eagle.base} stopOpacity={1} />
              <stop offset="100%" stopColor={colors.score.bogey.base} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="hole_number" tickFormatter={holeLabel} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={((value: number) => [Number(value ?? 0).toFixed(2), "Std dev"]) as Fmt}
          />
          <Bar dataKey="score_std_dev" fill={`url(#${gradientId})`} radius={chartLayout.barRadius} />
        </BarChart>
      );
  }
}

function ChartCard({ card }: { card: CourseChart }) {
  const gradientId = `course-chart-${card.kind}-${useId().replace(/:/g, "")}`;
  return (
    <ChartShell title={CHART_TITLES[card.kind]}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart(card, gradientId)}
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function CourseCharts({
  charts,
  selectedCharts,
  chartTabs,
  chartTab,
  onSelectChartTab,
}: CourseChartsProps) {
  return (
    <>
      <div className="md:hidden">
        <ToggleGroup
          variant="outline"
          spacing={2}
          value={[chartTab]}
          onValueChange={(values) => onSelectChartTab(values[0] ?? "")}
          className="mb-4 max-w-full overflow-x-auto [scrollbar-width:none]"
        >
          {chartTabs.map((tab) => (
            <ToggleGroupItem key={tab.key} value={tab.key}>
              {tab.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="space-y-5">
          {selectedCharts.map((card) => (
            <ChartCard key={card.kind} card={card} />
          ))}
        </div>
      </div>

      <div className="hidden gap-5 md:grid md:grid-cols-1 lg:grid-cols-2">
        {charts.map((card) => (
          <ChartCard key={card.kind} card={card} />
        ))}
      </div>
    </>
  );
}
