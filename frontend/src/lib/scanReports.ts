import { isFailureCategory, isFailureStage, type FailedScanAttempt, type ScanFailure } from "@/domain/scanReport";

/** A scan that failed, with the diagnostics a report may carry. */
export class ScanFailedError extends Error {
  readonly failure: ScanFailure;

  constructor(message: string, failure: ScanFailure) {
    super(message);
    this.name = "ScanFailedError";
    this.failure = failure;
  }
}

/** Copy only safe diagnostic fields, never the response's free-text detail. */
export async function readScanFailure(response: Response): Promise<ScanFailure> {
  const fallback: ScanFailure = { category: "http_error", stage: "unknown", http_status: response.status };
  try {
    const payload: unknown = await response.clone().json();
    const failure = typeof payload === "object" && payload !== null && "failure" in payload ? payload.failure : null;
    if (typeof failure !== "object" || failure === null || !("category" in failure)) return fallback;
    if (!isFailureCategory(failure.category)) return fallback;
    return {
      category: failure.category,
      stage: "stage" in failure && isFailureStage(failure.stage) ? failure.stage : "unknown",
      http_status: response.status,
    };
  } catch {
    return fallback;
  }
}

/** What went wrong with a scan, for a report: a request that never landed is a network error. */
export function scanFailureOf(error: unknown): ScanFailure {
  return error instanceof ScanFailedError
    ? error.failure
    : { category: "network_error", stage: "unknown", http_status: null };
}

const REPORTABLE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "pdf"];

export function failedScanAttempt(file: File, failure: ScanFailure): FailedScanAttempt {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return {
    // A Blob carries the bytes sent without the file's name or date.
    image: file.slice(0, file.size, file.type),
    extension: REPORTABLE_EXTENSIONS.includes(extension) ? extension : "bin",
    failure: { ...failure },
    retryKey: crypto.randomUUID(),
  };
}
