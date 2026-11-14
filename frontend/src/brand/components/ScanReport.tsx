import { Flag } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "@/brand/components/Button";
import type { ScanReportStatus } from "@/domain/scanReport";

interface ScanReportProps {
  status: ScanReportStatus;
  /** Why the last report wasn't saved. */
  error: string | null;
  onReport: () => void;
  className?: string;
}

const BUTTON_LABEL: Record<ScanReportStatus, string> = {
  idle: "Report failed scan",
  failed: "Report failed scan",
  sending: "Sending report…",
  sent: "Report sent",
};

/**
 * Under a failed read: what a report sends, the button that sends it, and how it went. Nothing
 * is sent until the golfer asks, and a sent report can't be sent again.
 */
function ScanReport({ status, error, onReport, className }: ScanReportProps) {
  return (
    <div
      role="group"
      aria-label="Scan report"
      data-slot="scan-report"
      className={cn("flex flex-col gap-2 text-body-sm", className)}
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Help us read cards like this one: send the photo and why it failed. Nothing about your account goes with
          it.
        </p>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={onReport}
          disabled={status === "sending" || status === "sent"}
        >
          <Flag data-icon="inline-start" />
          {BUTTON_LABEL[status]}
        </Button>
      </div>
      <p role="status" aria-live="polite" className={cn(error ? "text-destructive" : "text-muted-foreground")}>
        {status === "sent" ? "Thanks. Your report was saved." : error}
      </p>
    </div>
  );
}

export { ScanReport };
export type { ScanReportProps };
