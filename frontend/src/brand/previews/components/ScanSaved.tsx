import { ScanSaved } from "@/brand/components/ScanSaved";

const noop = () => {};

export default function ScanSavedPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">Saved</div>
        <ScanSaved course="Half Moon Bay Golf Links" score={79} toPar={8} onView={noop} onShare={noop} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">Under par, sharing</div>
        <ScanSaved course="Pebble Beach Golf Links" score={71} toPar={-1} onView={noop} onShare={noop} sharing />
      </div>
    </div>
  );
}
