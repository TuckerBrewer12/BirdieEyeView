import { useCallback, useRef, useState } from "react";
import type { FailedScanAttempt, ScanReportStatus } from "@/domain/scanReport";
import { REPORT_NOT_SAVED, scanReportRepository, type ScanReportRepository } from "./scanReportRepository";

/** Sending a failed scan for debugging, once the golfer asks to. */
export interface FailedScanReport {
  /** Whether there is a failed scan to report. */
  available: boolean;
  status: ScanReportStatus;
  /** Why the last report wasn't saved. */
  error: string | null;
  submit: () => void;
}

interface Submission {
  attempt: FailedScanAttempt;
  status: ScanReportStatus;
  error: string | null;
}

/**
 * Reports a failed scan only when asked, at most once per failure, and lets a failed report be
 * sent again. A report still in flight for an earlier failure can't mark a newer one sent.
 */
export function useFailedScanReport(
  attempt: FailedScanAttempt | null,
  repository: ScanReportRepository = scanReportRepository,
): FailedScanReport {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const pending = useRef(new Set<FailedScanAttempt>());
  const sent = useRef(new WeakSet<FailedScanAttempt>());
  const current = submission?.attempt === attempt ? submission : null;

  const submit = useCallback(() => {
    if (!attempt || pending.current.has(attempt) || sent.current.has(attempt)) return;
    pending.current.add(attempt);
    setSubmission({ attempt, status: "sending", error: null });
    repository.submit(attempt).then(
      () => {
        pending.current.delete(attempt);
        sent.current.add(attempt);
        setSubmission((prev) => (prev?.attempt === attempt ? { attempt, status: "sent", error: null } : prev));
      },
      (error: unknown) => {
        pending.current.delete(attempt);
        const message = error instanceof Error ? error.message : REPORT_NOT_SAVED;
        setSubmission((prev) => (prev?.attempt === attempt ? { attempt, status: "failed", error: message } : prev));
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
