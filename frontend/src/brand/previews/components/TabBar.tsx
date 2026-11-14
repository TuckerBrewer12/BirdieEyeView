import { useState, type ReactNode } from "react";
import { TabBar } from "@/brand/components/TabBar";

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

export default function TabBarPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-5 bg-background p-6">
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
