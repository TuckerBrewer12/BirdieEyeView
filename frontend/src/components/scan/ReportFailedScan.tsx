import { Button } from "@/brand";
import { AlertTriangle } from "lucide-react";
import type { FailedScanReportViewModel } from "@/types/scanReport";

export function ReportFailedScan({ report, error }: { report: FailedScanReportViewModel; error?: string | null }) {
  if (!report.available) return null;

  return (
    <div role="group" aria-label="Scan report" className="mb-4 space-y-2 text-sm">
      <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center">
        {error && (
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p role="alert">{error}</p>
          </div>
        )}
        <div className="shrink-0">
          <Button variant="danger" onClick={report.submit} disabled={report.status === "sending" || report.status === "sent"}>
            {report.status === "sending" ? "Sending report…" : report.status === "sent" ? "Report sent" : "Report failed scan"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400">Help improve scanning by sharing this scorecard and failure details. No account details are attached.</p>
      <div role="status" aria-live="polite">
        {report.status === "sent" && "Thanks — your report was saved for debugging."}
        {report.error}
      </div>
    </div>
  );
}
