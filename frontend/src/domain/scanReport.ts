export const FAILURE_CATEGORIES = [
  "unreadable_scores",
  "invalid_upload",
  "service_unavailable",
  "extraction_failed",
  "http_error",
  "network_error",
  "invalid_response",
] as const;

export const FAILURE_STAGES = ["upload", "ocr", "parse", "assembly", "unknown"] as const;

export type FailureCategory = (typeof FAILURE_CATEGORIES)[number];
export type FailureStage = (typeof FAILURE_STAGES)[number];

export interface ScanFailure {
  category: FailureCategory;
  stage: FailureStage;
  http_status: number | null;
}

export interface FailedScanAttempt {
  readonly image: Blob;
  readonly extension: string;
  readonly failure: Readonly<ScanFailure>;
  readonly retryKey: string;
}

export type ScanReportStatus = "idle" | "sending" | "sent" | "failed";

export function isFailureCategory(value: unknown): value is FailureCategory {
  return FAILURE_CATEGORIES.some((category) => category === value);
}

export function isFailureStage(value: unknown): value is FailureStage {
  return FAILURE_STAGES.some((stage) => stage === value);
}
