import { Stat, StatDelta, StatLabel, StatUnit, StatValue } from "@/brand/components/Stat";

export default function StatPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <Stat>
          <StatLabel>Scoring avg · L20</StatLabel>
          <StatValue size="xl">76.8</StatValue>
        </Stat>
        <StatDelta direction="down">0.4 vs L5</StatDelta>
      </div>

      <div className="flex items-center justify-between">
        <Stat>
          <StatLabel>Handicap</StatLabel>
          <StatValue size="lg">
            12.4<StatUnit>HCP</StatUnit>
          </StatValue>
        </Stat>
        <StatDelta direction="up" />
      </div>

      <div className="flex justify-around">
        <Stat align="center">
          <StatValue size="lg">38%</StatValue>
          <StatLabel>Scrambling</StatLabel>
        </Stat>
        <Stat align="center">
          <StatValue size="lg">—</StatValue>
          <StatLabel>Up &amp; Down</StatLabel>
        </Stat>
      </div>

      <div className="grid grid-cols-4">
        {[
          ["Best", "69"],
          ["Rounds", "4"],
          ["Putts", "32.0"],
          ["GIR", "39%"],
        ].map(([label, value]) => (
          <Stat key={label} align="center">
            <StatLabel>{label}</StatLabel>
            <StatValue size="sm">{value}</StatValue>
          </Stat>
        ))}
      </div>

      <div className="flex items-end gap-6">
        <Stat>
          <StatLabel>Up &amp; Down</StatLabel>
          <StatValue>
            33<StatUnit>%</StatUnit>
          </StatValue>
        </Stat>
        <StatDelta direction="flat">0.0</StatDelta>
        <StatDelta direction={null}>hidden</StatDelta>
      </div>
    </div>
  );
}
