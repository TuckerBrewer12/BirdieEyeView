import { useState } from "react";

/**
 * The tab a set of charts shows on a phone, and its charts. It starts on the first tab, and
 * a key that is not one of the tabs leaves it where it is.
 */
export function useChartTabs<T>(tabs: { key: string }[], charts: T[], groupOf: (chart: T) => string) {
  const [tab, setTab] = useState(tabs[0]?.key ?? "");
  return {
    tab,
    selectTab: (key: string) => {
      if (tabs.some((item) => item.key === key)) setTab(key);
    },
    /** The open tab's charts. */
    selected: charts.filter((chart) => groupOf(chart) === tab),
  };
}
