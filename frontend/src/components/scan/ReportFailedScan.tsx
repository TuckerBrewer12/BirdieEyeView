import { Button } from "@/brand";
import type { FailedScanReportViewModel } from "@/types/scanReport";

export function ReportFailedScan({ report }: { report: FailedScanReportViewModel }) {
  if (!report.available) return null;

  return (
    <div role="group" aria-label="Scan report" className="space-y-2 py-2 text-sm">
      <p>Help improve scanning by sharing this scorecard and failure details. No account details are attached.</p>
      <Button variant="secondary" onClick={report.submit} disabled={report.status === "sending" || report.status === "sent"}>
        {report.status === "sending" ? "Sending report…" : report.status === "sent" ? "Report sent" : "Report failed scan"}
      </Button>
      <div role="status" aria-live="polite">
        {report.status === "sent" && "Thanks — your report was saved for debugging."}
        {report.error}
      </div>
    </div>
  );
}
