import { ScanReport } from "@/brand/components/ScanReport";

const noop = () => undefined;

/** ScanReport in each state: ready, sending, sent, and a report that wasn't saved. */
export default function ScanReportPreview() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <ScanReport status="idle" error={null} onReport={noop} />
      <ScanReport status="sending" error={null} onReport={noop} />
      <ScanReport status="sent" error={null} onReport={noop} />
      <ScanReport status="failed" error="Reporting isn't available yet. Your report wasn't saved." onReport={noop} />
    </div>
  );
}
