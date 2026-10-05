import type { ScanReportRepository } from "@/data/scanReportRepository";
import type { FailedScanAttempt } from "@/types/scanReport";

export class FakeScanReportRepository implements ScanReportRepository {
  readonly attempts: FailedScanAttempt[] = [];
  private pending: { resolve: () => void; reject: (error: Error) => void }[] = [];

  submit(attempt: FailedScanAttempt): Promise<void> {
    this.attempts.push(attempt);
    return new Promise((resolve, reject) => this.pending.push({ resolve, reject }));
  }

  saveNext() { this.pending.shift()?.resolve(); }
  failNext(message = "Your report wasn't saved. Please try again.") {
    this.pending.shift()?.reject(new Error(message));
  }
}
