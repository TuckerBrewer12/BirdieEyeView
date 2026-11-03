import { StatStrip, StatStripItem } from "@/brand/components/Stat";

/** Board B, "stat strip": the four figures in one panel, at the board's 760 x 200. */
export default function StatStripPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 bg-background p-6">
      <StatStrip>
        <StatStripItem
          label="Scoring average"
          value="79.4"
          delta="1.8"
          direction="down"
          meter={55}
          detail="Range 74 – 88"
        />
        <StatStripItem
          label="Greens in regulation"
          value="44%"
          delta="3.1"
          direction="up"
          tone="good"
          meter={44}
          detail="7.9 of 18 per round"
        />
        <StatStripItem
          label="Putts per round"
          value="31.6"
          delta="0.4"
          direction="up"
          meter={62}
          detail="1.84 per GIR"
        />
        <StatStripItem
          label="3-putt rate"
          value="8.3%"
          delta="1.2"
          direction="down"
          meter={8}
          detail="1.5 per round"
        />
      </StatStrip>
    </div>
  );
}
