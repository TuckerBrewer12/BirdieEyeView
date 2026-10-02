import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFailedScanReport } from "../useFailedScanReport";
import { FakeScanReportRepository } from "@/testing/fakes/FakeScanReportRepository";
import { failedScanAttempt } from "@/lib/scanReports";
import type { FailedScanAttempt } from "@/types/scanReport";

function attempt() {
  return failedScanAttempt(new File(["image"], "private-name.png", { type: "image/png" }), {
    category: "unreadable_scores", stage: "parse", http_status: 422,
  });
}

describe("failed scan reporting", () => {
  it("requires an explicit click and prevents repeated submissions", async () => {
    const repository = new FakeScanReportRepository();
    const failed = attempt();
    const { result } = renderHook(() => useFailedScanReport(failed, repository));
    expect(repository.attempts).toHaveLength(0);
    act(() => { result.current.submit(); result.current.submit(); });
    expect(repository.attempts).toHaveLength(1);
    expect(result.current.status).toBe("sending");
    await act(async () => repository.saveNext());
    expect(result.current.status).toBe("sent");
    act(() => result.current.submit());
    expect(repository.attempts).toHaveLength(1);
  });

  it("retries a failed submission with the same image and retry key", async () => {
    const repository = new FakeScanReportRepository();
    const failed = attempt();
    const { result } = renderHook(() => useFailedScanReport(failed, repository));
    act(() => result.current.submit());
    await act(async () => repository.failNext());
    expect(result.current.status).toBe("failed");
    expect(result.current.error).toContain("wasn't saved");
    act(() => result.current.submit());
    expect(repository.attempts).toEqual([failed, failed]);
    await act(async () => repository.saveNext());
    expect(result.current.status).toBe("sent");
    expect(result.current.error).toBeNull();
  });

  it("a previous report finishing cannot mark a newer report as sent", async () => {
    const repository = new FakeScanReportRepository();
    const first = attempt();
    const second = attempt();
    const { result, rerender } = renderHook(
      ({ failed }: { failed: FailedScanAttempt | null }) => useFailedScanReport(failed, repository),
      { initialProps: { failed: first as FailedScanAttempt | null } },
    );
    act(() => result.current.submit());
    rerender({ failed: second });
    expect(result.current.status).toBe("idle");
    act(() => result.current.submit());
    await act(async () => repository.saveNext());
    expect(result.current.status).toBe("sending");
    await act(async () => repository.failNext());
    expect(result.current.status).toBe("failed");
    rerender({ failed: null });
    expect(result.current.available).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
