import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { queryKeys } from "@/data/queryKeys";
import { populatedRounds } from "@/testing/fixtures/rounds";
import { pebbleBeach } from "@/testing/fixtures/courses";
import { FakeRoundsRepository } from "@/testing/fakes/FakeRoundsRepository";
import { useLinkCourse } from "../useLinkCourse";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repository = new FakeRoundsRepository({ rounds: populatedRounds, courses: [pebbleBeach] });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useLinkCourse("user-1", repository), { wrapper });
  return { client, repository, result };
}

describe("useLinkCourse", () => {
  it("swaps the linked round into the cached rounds list", async () => {
    const { client, repository, result } = setup();
    client.setQueryData(queryKeys.rounds("user-1"), await repository.getRoundsForUser());

    act(() => result.current.mutate({ roundId: "round-4", courseId: pebbleBeach.id }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ id: string; course: { name: string | null } | null }[]>(
      queryKeys.rounds("user-1"),
    );
    expect(cached?.find((r) => r.id === "round-4")?.course?.name).toBe("Pebble Beach");
  });

  it("marks that round's cached detail stale", async () => {
    const { client, repository, result } = setup();
    client.setQueryData(queryKeys.round("round-4"), await repository.getRound("round-4"));

    act(() => result.current.mutate({ roundId: "round-4", courseId: pebbleBeach.id }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryState(queryKeys.round("round-4"))?.isInvalidated).toBe(true);
  });

  it("leaves the list uncached when nothing had loaded it", async () => {
    const { client, result } = setup();

    act(() => result.current.mutate({ roundId: "round-4", courseId: pebbleBeach.id }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(queryKeys.rounds("user-1"))).toBeUndefined();
  });
});
