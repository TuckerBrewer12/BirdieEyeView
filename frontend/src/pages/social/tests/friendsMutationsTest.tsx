import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { queryKeys } from "@/data/queryKeys";
import { golfers, populatedFriendships } from "@/testing/fixtures/friendships";
import { FakeFriendsRepository } from "@/testing/fakes/FakeFriendsRepository";
import type { Friendship } from "@/data/friendsModel";
import { useRespondToRequest } from "../useRespondToRequest";
import { useSendFriendRequest } from "../useSendFriendRequest";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repository = new FakeFriendsRepository({ friendships: populatedFriendships, golfers });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, repository, wrapper };
}

const cached = (client: QueryClient) =>
  client.getQueryData<Friendship[]>(queryKeys.friendships("user-1"));

describe("useSendFriendRequest", () => {
  it("puts the sent request at the top of the cached friendships", async () => {
    const { client, repository, wrapper } = setup();
    client.setQueryData(queryKeys.friendships("user-1"), await repository.getFriendships("user-1"));
    const { result } = renderHook(() => useSendFriendRequest("user-1", repository), { wrapper });

    act(() => result.current.mutate("GCSAM00003"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [first] = cached(client) ?? [];
    expect(first).toMatchObject({ id: "friendship-sam", direction: "sent", status: "pending" });
    expect(cached(client)).toHaveLength(populatedFriendships.length);
  });

  it("leaves the friendships uncached when nothing had loaded them", async () => {
    const { client, repository, wrapper } = setup();
    const { result } = renderHook(() => useSendFriendRequest("user-1", repository), { wrapper });

    act(() => result.current.mutate("GCSAM00003"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(cached(client)).toBeUndefined();
  });
});

describe("useRespondToRequest", () => {
  it("swaps the answered request into the cache", async () => {
    const { client, repository, wrapper } = setup();
    client.setQueryData(queryKeys.friendships("user-1"), await repository.getFriendships("user-1"));
    const { result } = renderHook(() => useRespondToRequest("user-1", repository), { wrapper });

    act(() => result.current.mutate({ friendshipId: "friendship-riley", answer: "accepted" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const riley = cached(client)?.find((f) => f.id === "friendship-riley");
    expect(riley?.status).toBe("accepted");
  });

  it("leaves the cache alone when the server refuses", async () => {
    const { client, repository, wrapper } = setup();
    const before = await repository.getFriendships("user-1");
    client.setQueryData(queryKeys.friendships("user-1"), before);
    const { result } = renderHook(() => useRespondToRequest("user-1", repository), { wrapper });

    // A request the golfer sent is not theirs to accept.
    act(() => result.current.mutate({ friendshipId: "friendship-casey", answer: "accepted" }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Friendship not found or action not permitted");
    expect(cached(client)).toBe(before);
  });
});
