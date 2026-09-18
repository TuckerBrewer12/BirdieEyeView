import { useId, useState, type MouseEvent, type ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import { line, area, curveMonotoneX } from "d3-shape";
import {
  Bar,
  BarChart,
  Cell,
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
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { chartLayout, chartTickStyle, chartTooltipStyle } from "@/brand/theme";
import type {
  CourseChartCard,
  CourseChartTheme,
  ChartTabKey,
  TabItem,
  TrendPoint,
} from "./useCourseDetailPageViewModel";

type Fmt = (value: unknown, name: unknown, props: unknown) => ReactNode | [ReactNode, string];

const SVG_WIDTH = 560;
const SVG_HEIGHT = 180;
const SVG_PAD = { top: 16, right: 16, bottom: 28, left: 36 };

interface CourseChartsProps {
  charts: CourseChartCard[];
  selectedCharts: CourseChartCard[];
  chartTabs: TabItem<ChartTabKey>[];
  chartTab: ChartTabKey;
  onSelectChartTab: (key: string) => void;
  theme: CourseChartTheme;
}

export function CourseScoreTrend({ data, theme }: { data: TrendPoint[]; theme: CourseChartTheme }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <ScoreTrendChart data={data} theme={theme} />
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

function ScoreTrendChart({ data, theme }: { data: TrendPoint[]; theme: CourseChartTheme }) {
  const [hovered, setHovered] = useState<TrendPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const areaId = `course-trend-area-${useId().replace(/:/g, "")}`;

  if (data.length < 2) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">Not enough data</div>
    );
  }

  const scores = data.map((point) => point.total_score);
  const xSc = scaleLinear().domain([0, data.length - 1]).range([SVG_PAD.left, SVG_WIDTH - SVG_PAD.right]);
  const ySc = scaleLinear()
    .domain([Math.min(...scores) - 3, Math.max(...scores) + 3])
    .range([SVG_HEIGHT - SVG_PAD.bottom, SVG_PAD.top]);
  const lineFn = line<TrendPoint>().x((_, i) => xSc(i)).y((d) => ySc(d.total_score)).curve(curveMonotoneX);
  const areaFn = area<TrendPoint>()
    .x((_, i) => xSc(i))
    .y0(SVG_HEIGHT - SVG_PAD.bottom)
    .y1((d) => ySc(d.total_score))
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
            <stop offset="5%" stopColor={theme.trend} stopOpacity={0.12} />
            <stop offset="95%" stopColor={theme.trend} stopOpacity={0} />
          </linearGradient>
        </defs>
        {gridTicks.map((tick) => (
          <line
            key={tick}
            x1={SVG_PAD.left}
            x2={SVG_WIDTH - SVG_PAD.right}
            y1={ySc(tick)}
            y2={ySc(tick)}
            stroke={theme.grid}
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
            fill={theme.axis}
          >
            {tick}
          </text>
        ))}
        <path d={areaD} fill={`url(#${areaId})`} />
        <path d={pathD} fill="none" stroke={theme.trend} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((point, i) => (
          <circle
            key={point.round_index}
            cx={xSc(i)}
            cy={ySc(point.total_score)}
            r={hovered === point ? 6 : 4}
            fill={point.fill}
            stroke={theme.card}
            strokeWidth={1.5}
          />
        ))}
        {hovered && (
          <line
            x1={xSc(data.indexOf(hovered))}
            x2={xSc(data.indexOf(hovered))}
            y1={SVG_PAD.top}
            y2={SVG_HEIGHT - SVG_PAD.bottom}
            stroke={theme.grid}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
        {data.length <= 12 && data.map((point, i) => point.tickLabel ? (
          <text
            key={`x${point.round_index}`}
            x={xSc(i)}
            y={SVG_HEIGHT - SVG_PAD.bottom + 14}
            textAnchor="middle"
            fontSize={chartTickStyle.fontSize}
            fill={theme.axis}
          >
            {point.tickLabel}
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
          <div className="mb-1 text-meta text-muted-foreground">{hovered.dateLabel}</div>
          <div className="text-sm font-bold text-foreground">{hovered.total_score}</div>
          {hovered.toParLabel && (
            <div className="mt-0.5 text-xs font-semibold" style={{ color: hovered.fill }}>
              {hovered.toParLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderChart(card: CourseChartCard, theme: CourseChartTheme, gradientId: string) {
  const axisTick = { ...chartTickStyle, fill: theme.axis };

  switch (card.kind) {
    case "toPar":
    case "difficulty":
      return (
        <BarChart data={card.rows} margin={chartLayout.margin}>
          <XAxis dataKey={card.kind === "difficulty" ? "label" : "hole_number"} tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={((value: number) => [Number(value ?? 0).toFixed(2), "Avg to Par"]) as Fmt}
          />
          <ReferenceLine y={0} stroke={theme.grid} />
          <Bar dataKey="average_to_par" radius={chartLayout.barRadius}>
            {card.rows.map((row) => (
              <Cell key={row.hole_number} fill={row.fill} />
            ))}
          </Bar>
        </BarChart>
      );
    case "scoreType":
      return (
        <BarChart data={card.rows} margin={chartLayout.margin}>
          <XAxis dataKey="hole_number" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.sample_size != null ? `${payload[0].payload.sample_size} rounds` : ""}
            formatter={((value: number) => [`${Number(value ?? 0).toFixed(1)}%`, ""]) as Fmt}
          />
          <Legend wrapperStyle={{ fontSize: chartTickStyle.fontSize }} />
          {card.series.map((series) => (
            <Bar key={series.key} dataKey={series.key} stackId="a" fill={series.fill} name={series.name} />
          ))}
        </BarChart>
      );
    case "gir":
      return (
        <BarChart data={card.rows} margin={chartLayout.margin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.girTop} stopOpacity={1} />
              <stop offset="100%" stopColor={theme.girBottom} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="hole_number" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={false} />
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
              <stop offset="0%" stopColor={theme.puttsTop} stopOpacity={1} />
              <stop offset="100%" stopColor={theme.puttsBottom} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="hole_number" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} />
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
              <stop offset="0%" stopColor={theme.varianceTop} stopOpacity={1} />
              <stop offset="100%" stopColor={theme.varianceBottom} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={((value: number) => [Number(value ?? 0).toFixed(2), "Std dev"]) as Fmt}
          />
          <Bar dataKey="score_std_dev" fill={`url(#${gradientId})`} radius={chartLayout.barRadius} />
        </BarChart>
      );
  }
}

function ChartCard({ card, theme }: { card: CourseChartCard; theme: CourseChartTheme }) {
  const gradientId = `course-chart-${card.kind}-${useId().replace(/:/g, "")}`;
  return (
    <ChartShell title={card.title}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart(card, theme, gradientId)}
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
  theme,
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
            <ChartCard key={card.kind} card={card} theme={theme} />
          ))}
        </div>
      </div>

      <div className="hidden gap-5 md:grid md:grid-cols-1 lg:grid-cols-2">
        {charts.map((card) => (
          <ChartCard key={card.kind} card={card} theme={theme} />
        ))}
      </div>
    </>
  );
}
