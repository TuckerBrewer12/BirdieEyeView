import { ShortGameCard } from "../components/ShortGameCard";

export default function ShortGameCardPreview() {
  return (
    <div className="flex flex-col gap-4">
      <ShortGameCard scramblingPct={38} upAndDownPct={33} onOpenLab={() => {}} />
      <ShortGameCard scramblingPct={64} upAndDownPct={null} onOpenLab={() => {}} />
    </div>
  );
}
