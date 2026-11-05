import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { golfers, populatedFriendships } from "@/testing/fixtures/friendships";
import { FakeFriendsRepository } from "@/testing/fakes/FakeFriendsRepository";
import { useFriendsInboxPageViewModel } from "../useFriendsInboxPageViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(
  repository = new FakeFriendsRepository({ friendships: populatedFriendships, golfers }),
) {
  const rendered = renderHook(() => useFriendsInboxPageViewModel("user-1", repository), {
    wrapper,
  });
  return { ...rendered, repository };
}

const ids = (requests: { id: string }[]) => requests.map((r) => r.id);

describe("useFriendsInboxPageViewModel", () => {
  it("opens on received requests and counts both tabs", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tab).toBe("received");
    expect(result.current.receivedCount).toBe(3);
    expect(result.current.sentCount).toBe(2);
    expect(ids(result.current.requests)).toEqual([
      "friendship-riley",
      "friendship-jordan",
      "friendship-sam",
    ]);
  });

  it("switches to the requests the golfer sent", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setTab("sent"));
    expect(ids(result.current.requests)).toEqual(["friendship-casey", "friendship-avery"]);
  });

  it("offers an answer only on a pending request the golfer received", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));

    const answerable = result.current.requests.filter(result.current.canRespond);
    expect(ids(answerable)).toEqual(["friendship-riley"]);
  });

  it("accepting a request updates it in place and reports how it was answered", async () => {
    const { result, repository } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.respond("friendship-riley", "accepted"));
    expect(result.current.isResponding("friendship-riley")).toBe(true);
    expect(result.current.isResponding("friendship-jordan")).toBe(false);

    await waitFor(() => expect(result.current.answered).toBe("accepted"));
    expect(result.current.isResponding("friendship-riley")).toBe(false);
    const riley = result.current.requests.find((r) => r.id === "friendship-riley");
    expect(riley?.status).toBe("accepted");
    expect(result.current.canRespond(riley!)).toBe(false);
    // The answer comes back from the mutation, not another fetch.
    expect(repository.getFriendshipsCalls).toBe(1);
  });

  it("clears the notice when the tab changes", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.respond("friendship-riley", "declined"));
    await waitFor(() => expect(result.current.answered).toBe("declined"));

    act(() => result.current.setTab("sent"));
    expect(result.current.answered).toBeNull();
  });

  it("shows the server's reason when an answer fails", async () => {
    const repository = new FakeFriendsRepository({
      friendships: populatedFriendships,
      golfers,
      respondError: "That request was withdrawn.",
    });
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.respond("friendship-riley", "accepted"));
    await waitFor(() => expect(result.current.respondError).toBe("That request was withdrawn."));
    expect(result.current.answered).toBeNull();
  });

  it("shows the empty copy for an empty tab but not over a load error", async () => {
    const empty = renderVm(new FakeFriendsRepository());
    await waitFor(() => expect(empty.result.current.loading).toBe(false));
    expect(empty.result.current.showEmpty).toBe(true);

    const failed = renderVm(new FakeFriendsRepository({ loadError: "Could not load inbox." }));
    await waitFor(() => expect(failed.result.current.loadError).toBe("Could not load inbox."));
    expect(failed.result.current.showEmpty).toBe(false);
  });
});
