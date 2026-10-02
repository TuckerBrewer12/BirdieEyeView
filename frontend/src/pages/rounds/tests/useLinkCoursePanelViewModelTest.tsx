import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { populatedRounds } from "@/testing/fixtures/rounds";
import { pebbleBeach } from "@/testing/fixtures/courses";
import {
  FakeRoundsRepository,
  type FakeRoundsRepositorySeed,
} from "@/testing/fakes/FakeRoundsRepository";
import { useLinkCoursePanelViewModel } from "../components/useLinkCoursePanelViewModel";

function renderVm(seed: FakeRoundsRepositorySeed = { rounds: populatedRounds, courses: [pebbleBeach] }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const repository = new FakeRoundsRepository(seed);
  const linked: string[] = [];
  const view = renderHook(
    () => useLinkCoursePanelViewModel("user-1", "round-4", () => linked.push("round-4"), repository),
    { wrapper },
  );
  return { ...view, repository, linked };
}

describe("useLinkCoursePanelViewModel", () => {
  it("finds saved courses as the golfer types", async () => {
    const { result } = renderVm();
    act(() => result.current.setQuery("Pebble"));
    await waitFor(() => expect(result.current.results.map((c) => c.name)).toEqual(["Pebble Beach"]));
  });

  it("picking a course links the round and tells the page", async () => {
    const { result, repository, linked } = renderVm();
    act(() => result.current.selectCourse(pebbleBeach));

    await waitFor(() => expect(linked).toEqual(["round-4"]));
    expect(repository.store.getRound("round-4").course?.name).toBe("Pebble Beach");
    expect(result.current.error).toBeNull();
  });

  it("a failed link shows why and does not tell the page", async () => {
    const { result, linked } = renderVm({ rounds: populatedRounds, linkError: "nope" });
    act(() => result.current.selectCourse(pebbleBeach));

    await waitFor(() => expect(result.current.error).toBe("nope"));
    expect(result.current.linking).toBe(false);
    expect(linked).toEqual([]);
  });
});
