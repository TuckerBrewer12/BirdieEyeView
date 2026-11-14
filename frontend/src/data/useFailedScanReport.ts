import { useMutation, useMutationState, useQueryClient, type MutationState } from "@tanstack/react-query";
import type { FailedScanAttempt, ScanReportStatus } from "@/domain/scanReport";
import { USER_FACING_ERRORS } from "@/lib/userFacingErrors";
import { queryKeys } from "./queryKeys";
import { scanReportRepository, type ScanReportRepository } from "./scanReportRepository";

export interface FailedScanReport {
  available: boolean;
  status: ScanReportStatus;
  error: string | null;
  submit: () => void;
}

const SENT_REPORT_KEPT_MS = 30 * 60 * 1000;

const STATUS: Record<MutationState["status"], ScanReportStatus> = {
  idle: "idle",
  pending: "sending",
  success: "sent",
  error: "failed",
};

export function useFailedScanReport(
  attempt: FailedScanAttempt | null,
  repository: ScanReportRepository = scanReportRepository,
): FailedScanReport {
  const queryClient = useQueryClient();
  const mutationKey = queryKeys.scanReport(attempt?.retryKey ?? null);
  const { mutate } = useMutation({
    mutationKey,
    mutationFn: (sent: FailedScanAttempt) => repository.submit(sent),
    gcTime: SENT_REPORT_KEPT_MS,
  });
  const latest = useMutationState({
    filters: { mutationKey, exact: true },
    select: (mutation) => mutation.state,
  }).at(-1);
  const status = attempt && latest ? STATUS[latest.status] : "idle";

  const submit = () => {
    if (!attempt) return;
    const underway = queryClient
      .getMutationCache()
      .findAll({ mutationKey, exact: true })
      .some((mutation) => mutation.state.status === "pending" || mutation.state.status === "success");
    if (!underway) mutate(attempt);
  };

  return {
    available: attempt !== null,
    status,
    error: status === "failed" ? (latest?.error?.message ?? USER_FACING_ERRORS.reportNotSaved) : null,
    submit,
  };
}
