import { useState, type ReactNode } from "react";
import { TabBar } from "@/brand/components/ChartTabs";

const TABS = ["Profile", "Scoring", "Ball striking", "Putting", "Approach"].map((label) => ({
  key: label,
  label,
}));

function Tabs() {
  const [tab, setTab] = useState("Scoring");
  return <TabBar tabs={TABS} value={tab} onValueChange={setTab} aria-label="Analytics sections" />;
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-label font-semibold text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

/**
 * The tab bar fills a window as wide as its board, so every tab fits; the phone's row sits in
 * a narrow box, where it scrolls. Below md, ChartTabs shows this bar above the active tab's
 * charts; from md up it shows every chart in a grid, in the course and round pages' screenshots.
 */
export default function ChartTabsPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-5.5 bg-background p-6">
      <Group label="Desktop · all tabs fit">
        <Tabs />
      </Group>
      <Group label="Mobile · scrolls, selected kept in view">
        <div className="w-75">
          <Tabs />
        </div>
      </Group>
    </div>
  );
}
