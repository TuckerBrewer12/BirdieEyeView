import { StatTiles } from "@/brand/components/StatTiles";

export default function StatTilesPreview() {
  return (
    <>
      {/* Five: three over two. */}
      <StatTiles
        tiles={[
          { label: "Handicap Index", value: "12.4" },
          { label: "Rounds", value: "24" },
          { label: "Scoring Avg", value: "84.2" },
          { label: "Best Round", value: "76", detail: "Pebble Beach Golf Links" },
          { label: "Avg Putts", value: "32.1" },
        ]}
      />

      {/* Four: two over two. */}
      <StatTiles
        tiles={[
          { label: "Rounds Played", value: "6" },
          { label: "Scoring Avg", value: "88.5" },
          { label: "Best Round", value: "82" },
          { label: "Worst Round", value: "—" },
        ]}
      />
    </>
  );
}
