import { apiUrl } from "@/lib/apiBase";
import type { FailedScanAttempt } from "@/types/scanReport";

export interface ScanReportRepository {
  submit(attempt: FailedScanAttempt): Promise<void>;
}

export const REPORT_NOT_SAVED = "Your report wasn't saved. Please try again.";
export const REPORT_UNAVAILABLE = "Reporting isn't available yet. Your report wasn't saved.";

/** Separate from authenticated API helpers, including on the signed-in page. */
export function createScanReportRepository(
  send: typeof fetch = (...args) => fetch(...args),
): ScanReportRepository {
  return {
    async submit(attempt) {
      const form = new FormData();
      form.append("file", attempt.image, `scorecard.${attempt.extension}`);
      form.append("metadata", JSON.stringify({
        schema_version: 1,
        retry_key: attempt.retryKey,
        category: attempt.failure.category,
        stage: attempt.failure.stage,
        http_status: attempt.failure.http_status,
      }));

      let response: Response;
      try {
        response = await send(apiUrl("/api/scan/reports"), {
          method: "POST",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
          body: form,
        });
      } catch {
        throw new Error(REPORT_NOT_SAVED);
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 503 && payload?.code === "report_storage_unavailable") {
          throw new Error(REPORT_UNAVAILABLE);
        }
        if (response.status === 429) throw new Error("Too many reports. Please try again later.");
        throw new Error(REPORT_NOT_SAVED);
      }
      if (payload?.status !== "saved") throw new Error(REPORT_NOT_SAVED);
    },
  };
}

export const scanReportRepository = createScanReportRepository();
