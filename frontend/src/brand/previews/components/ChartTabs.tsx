import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/brand/components/Card";
import { ChartTabs } from "@/brand/components/ChartTabs";

const TABS = [
  { key: "score", label: "Score" },
  { key: "putts", label: "Putts" },
];

const CHARTS = [
  { title: "Score", tab: "score" },
  { title: "Putts", tab: "putts" },
  { title: "3-Putts", tab: "putts" },
];

function Tabs() {
  const [tab, setTab] = useState("putts");
  return (
    <ChartTabs
      tabs={TABS}
      value={tab}
      onValueChange={(key) => key && setTab(key)}
      charts={CHARTS}
      selectedCharts={CHARTS.filter((chart) => chart.tab === tab)}
      keyFor={(chart) => chart.title}
      renderChart={(chart) => (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{chart.title}</CardTitle>
          </CardHeader>
          <CardContent className="h-16 text-xs text-muted-foreground">Chart</CardContent>
        </Card>
      )}
    />
  );
}

// The harness is desktop-width, so this is the md+ grid of every chart. The tabs and
// the two mobile layouts show below md, in the course and round pages' mobile screenshots.
export default function ChartTabsPreview() {
  return <Tabs />;
}
