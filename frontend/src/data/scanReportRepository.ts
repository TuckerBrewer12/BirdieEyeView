import { api } from "@/lib/api";
import type { FailedScanAttempt } from "@/domain/scanReport";

export interface ScanReportRepository {
  submit(attempt: FailedScanAttempt): Promise<void>;
}

export const scanReportRepository: ScanReportRepository = {
  async submit(attempt) {
    await api.reportFailedScan(attempt);
  },
};
