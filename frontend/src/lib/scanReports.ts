import { failureCategories, failureStages } from "@/types/scanReport";
import type { FailedScanAttempt, ScanFailure } from "@/types/scanReport";

/** Copy only safe diagnostic fields, never the response's free-text detail. */
export async function readScanFailure(response: Response): Promise<ScanFailure> {
  const fallback: ScanFailure = { category: "http_error", stage: "unknown", http_status: response.status };
  try {
    const payload = await response.clone().json();
    const failure = payload?.failure;
    if (!failureCategories.includes(failure?.category)) return fallback;
    return {
      category: failure.category,
      stage: failureStages.includes(failure.stage) ? failure.stage : "unknown",
      http_status: response.status,
    };
  } catch {
    return fallback;
  }
}

export function failedScanAttempt(file: File, failure: ScanFailure): FailedScanAttempt {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return {
    // A Blob carries the submitted bytes without the original name/lastModified.
    image: file.slice(0, file.size, file.type),
    extension: ["jpg", "jpeg", "png", "webp", "heic", "pdf"].includes(extension) ? extension : "bin",
    failure: { ...failure },
    retryKey: crypto.randomUUID(),
  };
}
