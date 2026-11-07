import { act, renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useChartTabs } from "./useChartTabs";

const TABS = [{ key: "score" }, { key: "putts" }];
const CHARTS = [
  { title: "Score", tab: "score" },
  { title: "Putts", tab: "putts" },
  { title: "3-Putts", tab: "putts" },
];

function renderTabs() {
  return renderHook(() => useChartTabs(TABS, CHARTS, (chart) => chart.tab));
}

describe("useChartTabs", () => {
  it("starts on the first tab with its charts", () => {
    const { result } = renderTabs();
    expect(result.current.tab).toBe("score");
    expect(result.current.selected.map((chart) => chart.title)).toEqual(["Score"]);
  });

  it("a tab shows only its own charts", () => {
    const { result } = renderTabs();
    act(() => result.current.selectTab("putts"));
    expect(result.current.tab).toBe("putts");
    expect(result.current.selected.map((chart) => chart.title)).toEqual(["Putts", "3-Putts"]);
  });

  it("ignores a tab it does not have", () => {
    const { result } = renderTabs();
    act(() => result.current.selectTab("putts"));
    act(() => result.current.selectTab("driving"));
    expect(result.current.tab).toBe("putts");
  });
});
