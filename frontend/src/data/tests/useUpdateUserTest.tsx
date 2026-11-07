import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { FakeSettingsRepository } from "@/testing/fakes/FakeSettingsRepository";
import { pebbleBeach } from "@/testing/fixtures/courses";
import { queryKeys } from "../queryKeys";
import { useUpdateUser } from "../useUpdateUser";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repository = new FakeSettingsRepository({ user: { handicap: 12, scoring_goal: 89 }, courses: [pebbleBeach] });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useUpdateUser("user-1", repository, repository), { wrapper });
  return { client, repository, result };
}

describe("useUpdateUser", () => {
  it("puts the saved user in the user cache", async () => {
    const { client, repository, result } = setup();
    client.setQueryData(queryKeys.user("user-1"), repository.user);

    act(() => result.current.mutate({ scoring_goal: 79 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData<{ scoring_goal: number | null }>(queryKeys.user("user-1"))?.scoring_goal).toBe(79);
  });

  it("marks the figures that start from the profile stale", async () => {
    const { client, result } = setup();
    const keys = [
      queryKeys.round("round-1"),
      queryKeys.course("course-1"),
      queryKeys.dashboard("user-1"),
      queryKeys.goalReport("user-1"),
      queryKeys.analytics("user-1", { limit: 20 }),
    ];
    for (const key of keys) client.setQueryData(key, {});

    act(() => result.current.mutate({ handicap: 4 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it("has a newly picked home course loaded by the time the save settles", async () => {
    const { client, result } = setup();

    act(() => result.current.mutate({ home_course_id: pebbleBeach.id }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData<{ name: string | null }>(queryKeys.course(pebbleBeach.id))?.name).toBe(pebbleBeach.name);
  });

  it("leaves the cache alone when the save fails", async () => {
    const { client, repository, result } = setup();
    client.setQueryData(queryKeys.user("user-1"), repository.user);
    repository.saveError = new Error("Forbidden");

    act(() => result.current.mutate({ handicap: 4 }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(client.getQueryData<{ handicap: number | null }>(queryKeys.user("user-1"))?.handicap).toBe(12);
    expect(client.getQueryState(queryKeys.user("user-1"))?.isInvalidated).toBe(false);
  });
});
