export const failureCategories = [
  "unreadable_scores", "invalid_upload", "service_unavailable", "extraction_failed",
  "http_error", "network_error", "invalid_response",
] as const;
export const failureStages = ["upload", "ocr", "parse", "assembly", "unknown"] as const;

export interface ScanFailure {
  category: typeof failureCategories[number];
  stage: typeof failureStages[number];
  http_status: number | null;
}

export interface FailedScanAttempt {
  readonly image: Blob;
  readonly extension: string;
  readonly failure: Readonly<ScanFailure>;
  readonly retryKey: string;
}

export type ScanReportStatus = "idle" | "sending" | "sent" | "failed";

export interface FailedScanReportViewModel {
  available: boolean;
  status: ScanReportStatus;
  error: string | null;
  submit: () => void;
}
