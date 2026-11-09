import { ShortGameCard } from "../components/ShortGameCard";

export default function ShortGameCardPreview() {
  return (
    <div className="flex w-preview flex-col gap-4 bg-background p-5">
      <ShortGameCard scramblingPct={38} upAndDownPct={33} />
      <ShortGameCard scramblingPct={61} upAndDownPct={null} />
    </div>
  );
}
