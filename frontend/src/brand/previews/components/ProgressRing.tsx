import { ProgressRing } from "@/brand/components/ProgressRing";

export default function ProgressRingPreview() {
  return (
    <div className="flex items-center gap-6">
      <ProgressRing value={82} label="Progress to break 80" className="size-20" />
      <ProgressRing value={100} label="Progress to break 90" className="size-20" />
      <ProgressRing value={null} label="Progress to break 72" className="size-20" />
      <ProgressRing value={62} thick label="Progress to break 85" className="size-16" />
    </div>
  );
}
