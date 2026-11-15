import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/brand/components/Alert";
import { ScanReport } from "@/brand/components/ScanReport";
import type { ScanReportStatus } from "@/domain/scanReport";

const noop = () => undefined;

function InBanner({ status }: { status: ScanReportStatus }) {
  return (
    <Alert tone="danger">
      <CircleAlert />
      <AlertDescription>
        <strong className="font-semibold">Couldn't read this card.</strong> Try a flatter, brighter photo.{" "}
        <ScanReport status={status} error={null} onSend={noop} />
      </AlertDescription>
    </Alert>
  );
}

export default function ScanReportPreview() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <InBanner status="idle" />
      <InBanner status="sent" />
    </div>
  );
}
