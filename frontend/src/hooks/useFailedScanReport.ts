import { useCallback, useRef, useState } from "react";
import { REPORT_NOT_SAVED, scanReportRepository } from "@/data/scanReportRepository";
import type { ScanReportRepository } from "@/data/scanReportRepository";
import type { FailedScanAttempt, FailedScanReportViewModel, ScanReportStatus } from "@/types/scanReport";

interface Submission {
  attempt: FailedScanAttempt;
  status: ScanReportStatus;
  error: string | null;
}

export function useFailedScanReport(
  attempt: FailedScanAttempt | null,
  repository: ScanReportRepository = scanReportRepository,
): FailedScanReportViewModel {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const pending = useRef(new Set<FailedScanAttempt>());
  const sent = useRef(new WeakSet<FailedScanAttempt>());
  const current = submission?.attempt === attempt ? submission : null;

  const submit = useCallback(() => {
    if (!attempt || pending.current.has(attempt) || sent.current.has(attempt)) return;
    pending.current.add(attempt);
    setSubmission({ attempt, status: "sending", error: null });
    void repository.submit(attempt).then(
      () => {
        pending.current.delete(attempt);
        sent.current.add(attempt);
        setSubmission((prev) => prev?.attempt === attempt ? { attempt, status: "sent", error: null } : prev);
      },
      (error: unknown) => {
        pending.current.delete(attempt);
        setSubmission((prev) => prev?.attempt === attempt ? {
          attempt, status: "failed", error: error instanceof Error ? error.message : REPORT_NOT_SAVED,
        } : prev);
      },
    );
  }, [attempt, repository]);

  return {
    available: attempt !== null,
    status: current?.status ?? "idle",
    error: current?.error ?? null,
    submit,
  };
}
