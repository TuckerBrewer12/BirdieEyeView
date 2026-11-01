import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { FakeLabRepository } from "@/testing/fakes/FakeLabRepository";
import { labGoalReport } from "@/testing/fixtures/lab";
import { useGoalReport } from "../useGoalReport";

function setup(goal: number | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repository = new FakeLabRepository({ goalReport: labGoalReport });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useGoalReport("user-1", goal, repository), { wrapper });
  return { repository, result };
}

describe("useGoalReport", () => {
  it("reads the report once a goal is set", async () => {
    const { result } = setup(89);
    await waitFor(() => expect(result.current.data).toEqual(labGoalReport));
  });

  it("asks for nothing without a goal", () => {
    const { repository, result } = setup(null);
    expect(result.current.fetchStatus).toBe("idle");
    expect(repository.goalReportRequests).toBe(0);
  });
});
