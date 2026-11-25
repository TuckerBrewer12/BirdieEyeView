import { QueryClient, type QueryKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { roundsChanged, userChanged } from "../playerCache";
import { queryKeys } from "../queryKeys";

function cacheWith(keys: QueryKey[]) {
  const client = new QueryClient();
  for (const key of keys) client.setQueryData(key, {});
  return client;
}

function stale(client: QueryClient, keys: QueryKey[]) {
  return keys.filter((key) => client.getQueryState(key)?.isInvalidated);
}

const fromRounds = [
  queryKeys.rounds("user-1"),
  queryKeys.round("round-1"),
  queryKeys.roundComparison("user-1", "round-2"),
  queryKeys.dashboard("user-1"),
  queryKeys.analytics("user-1", { limit: 20 }),
  queryKeys.benchmarkComparison("user-1", { against: "handicap" }),
  queryKeys.goalReport("user-1", 89),
  queryKeys.playedCourses("user-1"),
  queryKeys.courses("user-1", "pebble"),
  queryKeys.courseAnalytics("user-1", "course-1"),
  queryKeys.course("course-1"),
];

const unrelated = [
  queryKeys.user("user-1"),
  queryKeys.friendships("user-1"),
  queryKeys.dashboard("user-2"),
  queryKeys.rounds("user-2"),
];

describe("playerCache", () => {
  it("marks every figure a round feeds stale when the golfer's rounds change", async () => {
    const client = cacheWith([...fromRounds, ...unrelated]);

    await roundsChanged(client, "user-1");

    expect(stale(client, fromRounds)).toEqual(fromRounds);
    expect(stale(client, unrelated)).toEqual([]);
  });

  it("marks the figures that start from the profile stale when the golfer changes", async () => {
    const fromUser = [
      queryKeys.settings("user-1"),
      queryKeys.round("round-1"),
      queryKeys.course("course-1"),
      queryKeys.dashboard("user-1"),
      queryKeys.goalReport("user-1", 89),
      queryKeys.analytics("user-1", { limit: 20 }),
    ];
    const client = cacheWith([...fromUser, ...unrelated]);

    await userChanged(client, "user-1");

    expect(stale(client, fromUser)).toEqual(fromUser);
    expect(stale(client, unrelated)).toEqual([]);
  });
});
