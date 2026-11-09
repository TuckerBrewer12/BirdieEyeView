import { StatStrip, StatStripItem } from "@/brand/components/StatStrip";

/** The dashboard's strip: five figures, two that open more, three with a line. */
export default function StatStripPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-6 overflow-auto bg-background p-6">
      <StatStrip className="max-w-240">
        <StatStripItem
          label="Handicap"
          value="12.4"
          delta="1.6"
          direction="down"
          tone="good"
          trend={[14.4, 13.9, 13.3, 12.9, 12.4]}
          onClick={() => undefined}
        />
        <StatStripItem
          label="Scoring avg"
          value="76.8"
          delta="2.1"
          direction="down"
          tone="good"
          trend={[80.2, 78.9, 77.6, 77.9, 76.8]}
        />
        <StatStripItem label="Best · Blue Rock" value="69" onClick={() => undefined} />
        <StatStripItem label="Rounds played" value="4" />
        <StatStripItem label="Scrambling" value="38%" trend={[37, 39, 38, 38, 38]} />
      </StatStrip>
      <StatStrip className="max-w-md">
        <StatStripItem label="Putts" value="32.0" delta="0.4" direction="up" tone="bad" trend={[31, 31.5, 32, 31.8, 32]} />
        <StatStripItem label="Greens hit" value="39%" />
      </StatStrip>
    </div>
  );
}
