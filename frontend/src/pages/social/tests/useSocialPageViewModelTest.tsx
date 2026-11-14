import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { golfers, populatedFriendships } from "@/testing/fixtures/friendships";
import { FakeFriendsRepository } from "@/testing/fakes/FakeFriendsRepository";
import { useSocialPageViewModel } from "../useSocialPageViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(repository = new FakeFriendsRepository({ friendships: populatedFriendships, golfers })) {
  const rendered = renderHook(() => useSocialPageViewModel("user-1", repository), { wrapper });
  return { ...rendered, repository };
}

describe("useSocialPageViewModel", () => {
  it("lists accepted friends only", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.friends.map((f) => f.other.name)).toEqual([
      "Avery Lin",
      "Jordan Castellanos",
    ]);
    expect(result.current.showEmpty).toBe(false);
  });

  it("counts the requests waiting for the golfer's answer, not the ones they sent", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.openRequests).toBe(1);
  });

  it("hands over the golfer's own code, or null before the server has one", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.myCode).toBe("TGOLF7Q2"));

    const none = renderVm(new FakeFriendsRepository({ myCode: null }));
    await waitFor(() => expect(none.result.current.loading).toBe(false));
    expect(none.result.current.myCode).toBeNull();
  });

  it("shows the empty copy only for a successful empty list", async () => {
    const { result } = renderVm(new FakeFriendsRepository());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadError).toBeNull();
    expect(result.current.showEmpty).toBe(true);
  });

  it("surfaces a load error instead of the empty copy", async () => {
    const { result } = renderVm(new FakeFriendsRepository({ loadError: "Could not load friends." }));
    await waitFor(() => expect(result.current.loadError).toBe("Could not load friends."));
    expect(result.current.showEmpty).toBe(false);
  });

  it("upper-cases the friend code as it is typed", async () => {
    const { result } = renderVm();
    act(() => result.current.setFriendCode("gcsam00003"));
    expect(result.current.friendCode).toBe("GCSAM00003");
  });

  it("asks for a code instead of sending an empty one", async () => {
    const { result, repository } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFriendCode("   "));
    act(() => result.current.sendRequest());

    expect(result.current.codeMissing).toBe(true);
    expect(repository.store.sentCodes).toEqual([]);

    act(() => result.current.setFriendCode("G"));
    expect(result.current.codeMissing).toBe(false);
  });

  it("sends the trimmed code, then clears the field and reports it sent", async () => {
    const { result, repository } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFriendCode(" gcsam00003 "));
    act(() => result.current.sendRequest());

    await waitFor(() => expect(result.current.sent).toBe(true));
    expect(repository.store.sentCodes).toEqual(["GCSAM00003"]);
    expect(result.current.friendCode).toBe("");
    expect(result.current.sendError).toBeNull();

    act(() => result.current.setFriendCode("X"));
    expect(result.current.sent).toBe(false);
  });

  it("keeps the code and shows the server's reason when a send fails", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFriendCode("NOPE1234"));
    act(() => result.current.sendRequest());

    await waitFor(() => expect(result.current.sendError).toBe("Friend code not found"));
    expect(result.current.friendCode).toBe("NOPE1234");
    expect(result.current.sent).toBe(false);

    act(() => result.current.setFriendCode("NOPE12345"));
    expect(result.current.sendError).toBeNull();
  });
});
