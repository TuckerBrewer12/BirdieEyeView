import { Meter } from "@/brand/components/Meter";

export default function MeterPreview() {
  return (
    <div className="flex flex-col gap-5">
      <Meter value={62} tone="progress" aria-label="Goal progress" />
      <Meter value={100} tone="success" aria-label="Goal reached" />
      <Meter value={38} marker={57} size="sm" aria-label="Scrambling against tour" />
      <Meter value={null} marker={50} size="sm" aria-label="Up and down, not measured" />
      <Meter value={140} marker={-10} aria-label="Clamped" />
    </div>
  );
}
