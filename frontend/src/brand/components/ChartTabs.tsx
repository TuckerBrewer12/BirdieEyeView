import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { cn } from "@/brand/cn";

interface TabBarProps {
  tabs: { key: string; label: string }[];
  value: string;
  onValueChange: (key: string) => void;
  /** What the tabs switch between, for screen readers. */
  "aria-label": string;
  className?: string;
}

/**
 * Tabs for the sections of one page: a row of labels over a rule, the current one inked and
 * underlined in the brand colour. Where the labels fit they sit side by side; where they do
 * not the row scrolls sideways, keeps the current tab in view, and fades out at the end that
 * has more. Not for filters: those are a segmented control.
 */
function TabBar({ tabs, value, onValueChange, "aria-label": ariaLabel, className }: TabBarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => setMore(list.scrollLeft + list.clientWidth < list.scrollWidth - 1);
    update();
    list.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [tabs]);

  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>("[aria-selected='true']");
    if (!list || !tab) return;
    const start = tab.offsetLeft;
    const end = start + tab.offsetWidth;
    // Keep clear of the fade at the right end, so the current tab never sits under it.
    const margin = list.clientWidth * 0.15;
    if (start < list.scrollLeft) list.scrollLeft = start;
    else if (end > list.scrollLeft + list.clientWidth - margin) {
      list.scrollLeft = end - list.clientWidth + margin;
    }
  }, [value, tabs]);

  return (
    <Tabs.Root
      data-slot="tab-bar"
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      className={cn("@container relative", className)}
    >
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-border" />
      <Tabs.List
        ref={listRef}
        aria-label={ariaLabel}
        className="relative flex gap-5 overflow-x-auto pl-1 whitespace-nowrap [scrollbar-width:none] motion-safe:scroll-smooth @md:gap-6 @md:pl-0"
      >
        {tabs.map((tab) => (
          <Tabs.Tab
            key={tab.key}
            value={tab.key}
            className="h-10.5 shrink-0 cursor-pointer border-b-2 border-transparent text-sm font-medium text-foreground-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:border-primary aria-selected:font-bold aria-selected:text-foreground"
          >
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {more && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-r from-transparent to-background"
        />
      )}
    </Tabs.Root>
  );
}

interface ChartTabsProps<T> {
  tabs: { key: string; label: string }[];
  value: string;
  onValueChange: (key: string) => void;
  /** Every chart, laid out as a grid from md up. */
  charts: T[];
  /** The active tab's charts, shown one tab at a time below md. */
  selectedCharts: T[];
  keyFor: (chart: T) => string;
  renderChart: (chart: T) => ReactNode;
  /** What the tabs switch between, for screen readers. */
  label?: string;
  /** Below md: stack the tab's charts, or set small ones two to a row when the tab has several. */
  mobileLayout?: "stack" | "pairs";
}

/**
 * A set of charts that is too many for a phone. Below md it shows a row of tabs and
 * the active tab's charts; from md up it shows every chart in a two-column grid.
 */
function ChartTabs<T>({
  tabs,
  value,
  onValueChange,
  charts,
  selectedCharts,
  keyFor,
  renderChart,
  label = "Chart sections",
  mobileLayout = "stack",
}: ChartTabsProps<T>) {
  return (
    <div data-slot="chart-tabs">
      <div className="md:hidden">
        <TabBar
          tabs={tabs}
          value={value}
          onValueChange={onValueChange}
          aria-label={label}
          className="mb-4"
        />
        <div
          className={cn(
            mobileLayout === "stack" && "space-y-5",
            mobileLayout === "pairs" && selectedCharts.length > 1 && "grid grid-cols-2 gap-3",
          )}
        >
          {selectedCharts.map((chart) => (
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

export { ChartTabs, TabBar };
