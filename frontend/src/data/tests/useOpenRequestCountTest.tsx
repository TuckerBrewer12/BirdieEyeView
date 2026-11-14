import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { golfers, populatedFriendships } from "@/testing/fixtures/friendships";
import { FakeFriendsRepository } from "@/testing/fakes/FakeFriendsRepository";
import { useRespondToRequest } from "@/pages/social/useRespondToRequest";
import { useOpenRequestCount } from "../useOpenRequestCount";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repository = new FakeFriendsRepository({ friendships: populatedFriendships, golfers });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { repository, wrapper };
}

describe("useOpenRequestCount", () => {
  it("counts received requests still pending, and never reads the full friends list", async () => {
    const { repository, wrapper } = setup();
    const received = (await repository.getPendingFriendships("user-1")).filter(
      (f) => f.direction === "received",
    );

    const { result } = renderHook(() => useOpenRequestCount("user-1", repository), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(received.length));
    expect(received.length).toBeGreaterThan(0);
    expect(repository.getFriendshipsCalls).toBe(0);
  });

  it("drops by one when the golfer answers a request", async () => {
    const { repository, wrapper } = setup();
    const { result } = renderHook(
      () => ({ count: useOpenRequestCount("user-1", repository), respond: useRespondToRequest("user-1", repository) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.count.data).toBeDefined());
    const before = result.current.count.data ?? 0;

    act(() => result.current.respond.mutate({ friendshipId: "friendship-riley", answer: "accepted" }));

    await waitFor(() => expect(result.current.count.data).toBe(before - 1));
  });

  it("asks nothing before the golfer is known", () => {
    const { repository, wrapper } = setup();
    const { result } = renderHook(() => useOpenRequestCount("", repository), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
