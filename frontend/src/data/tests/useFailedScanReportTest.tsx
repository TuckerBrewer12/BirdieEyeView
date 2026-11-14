import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useFailedScanReport } from "../useFailedScanReport";
import { FakeScanReportRepository } from "@/testing/fakes/FakeScanReportRepository";
import { failedScanAttempt } from "@/lib/scanReports";
import type { FailedScanAttempt } from "@/domain/scanReport";

function attempt() {
  return failedScanAttempt(new File(["image"], "private-name.png", { type: "image/png" }), {
    category: "unreadable_scores", stage: "parse", http_status: 422,
  });
}

function queryWrapper(client = new QueryClient()) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("failed scan reporting", () => {
  it("requires an explicit click and prevents repeated submissions", async () => {
    const repository = new FakeScanReportRepository();
    const failed = attempt();
    const { result } = renderHook(() => useFailedScanReport(failed, repository), { wrapper: queryWrapper() });
    expect(repository.attempts).toHaveLength(0);
    await act(async () => { result.current.submit(); result.current.submit(); });
    expect(repository.attempts).toHaveLength(1);
    await waitFor(() => expect(result.current.status).toBe("sending"));
    await act(async () => repository.saveNext());
    await waitFor(() => expect(result.current.status).toBe("sent"));
    await act(async () => result.current.submit());
    expect(repository.attempts).toHaveLength(1);
  });

  it("retries a failed submission with the same image and retry key", async () => {
    const repository = new FakeScanReportRepository();
    const failed = attempt();
    const { result } = renderHook(() => useFailedScanReport(failed, repository), { wrapper: queryWrapper() });
    await act(async () => result.current.submit());
    await act(async () => repository.failNext());
    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.error).toContain("wasn't saved");
    await act(async () => result.current.submit());
    expect(repository.attempts).toEqual([failed, failed]);
    await act(async () => repository.saveNext());
    await waitFor(() => expect(result.current.status).toBe("sent"));
    expect(result.current.error).toBeNull();
  });

  it("a previous report finishing cannot mark a newer report as sent", async () => {
    const repository = new FakeScanReportRepository();
    const first = attempt();
    const second = attempt();
    const { result, rerender } = renderHook(
      ({ failed }: { failed: FailedScanAttempt | null }) => useFailedScanReport(failed, repository),
      { initialProps: { failed: first as FailedScanAttempt | null }, wrapper: queryWrapper() },
    );
    await act(async () => result.current.submit());
    rerender({ failed: second });
    expect(result.current.status).toBe("idle");
    await act(async () => result.current.submit());
    await act(async () => repository.saveNext());
    await waitFor(() => expect(result.current.status).toBe("sending"));
    await act(async () => repository.failNext());
    await waitFor(() => expect(result.current.status).toBe("failed"));
    rerender({ failed: null });
    expect(result.current.available).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("still shows a sent report after leaving the page and coming back", async () => {
    const repository = new FakeScanReportRepository();
    const failed = attempt();
    const wrapper = queryWrapper();
    const first = renderHook(() => useFailedScanReport(failed, repository), { wrapper });
    await act(async () => first.result.current.submit());
    await act(async () => repository.saveNext());
    await waitFor(() => expect(first.result.current.status).toBe("sent"));
    first.unmount();

    const { result } = renderHook(() => useFailedScanReport(failed, repository), { wrapper });
    expect(result.current.status).toBe("sent");
    await act(async () => result.current.submit());
    expect(repository.attempts).toHaveLength(1);
  });
});
