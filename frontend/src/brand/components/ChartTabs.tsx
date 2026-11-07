import { Fragment, type ReactNode } from "react";
import { cn } from "@/brand/cn";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup";
import { useChartTabs } from "./useChartTabs";

interface ChartTabsProps<T> {
  /** Below md, one tab at a time, starting on the first. */
  tabs: { key: string; label: string }[];
  /** Every chart, laid out as a grid from md up. */
  charts: T[];
  /** The tab a chart is shown under. */
  groupOf: (chart: T) => string;
  keyFor: (chart: T) => string;
  renderChart: (chart: T) => ReactNode;
  /** Below md: stack the tab's charts, or set small ones two to a row when the tab has several. */
  mobileLayout?: "stack" | "pairs";
}

/**
 * A set of charts that is too many for a phone. Below md it shows a row of tabs and
 * the active tab's charts; from md up it shows every chart in a two-column grid.
 */
function ChartTabs<T>({
  tabs,
  charts,
  groupOf,
  keyFor,
  renderChart,
  mobileLayout = "stack",
}: ChartTabsProps<T>) {
  const { tab, selectTab, selected } = useChartTabs(tabs, charts, groupOf);
  return (
    <div data-slot="chart-tabs">
      <div className="md:hidden">
        <ToggleGroup
          variant="outline"
          spacing={2}
          value={[tab]}
          onValueChange={(values) => selectTab(values[0] ?? "")}
          className="mb-4 max-w-full overflow-x-auto [scrollbar-width:none]"
        >
          {tabs.map((item) => (
            <ToggleGroupItem key={item.key} value={item.key}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div
          className={cn(
            mobileLayout === "stack" && "space-y-5",
            mobileLayout === "pairs" && selected.length > 1 && "grid grid-cols-2 gap-3",
          )}
        >
          {selected.map((chart) => (
            <Fragment key={keyFor(chart)}>{renderChart(chart)}</Fragment>
          ))}
        </div>
      </div>

      <div className="hidden grid-cols-1 gap-5 md:grid lg:grid-cols-2">
        {charts.map((chart) => (
          <Fragment key={keyFor(chart)}>{renderChart(chart)}</Fragment>
        ))}
      </div>
    </div>
  );
}

export { ChartTabs };
