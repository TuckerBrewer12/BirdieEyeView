import { describe, expect, it } from "vitest";
import type { Person } from "@/data/friendsModel";
import { compareLink, friendDetail, requestsLabel } from "../present";

const person = (handicapIndex: number | null, lastPlayed: string | null): Person => ({
  id: "user-avery",
  name: "Avery Lin",
  email: null,
  handicapIndex,
  lastPlayed,
});

describe("friendDetail", () => {
  it("gives the index and the last round", () => {
    expect(friendDetail(person(8.2, "2026-10-28"))).toBe("Handicap 8.2 · played Oct 28");
  });

  it("writes a plus handicap with its plus", () => {
    expect(friendDetail(person(-1.4, null))).toBe("Handicap +1.4");
  });

  it("gives what there is, or says there are no rounds", () => {
    expect(friendDetail(person(null, "2026-10-12"))).toBe("Played Oct 12");
    expect(friendDetail(person(null, null))).toBe("No rounds yet");
  });
});

describe("the Requests button and Compare", () => {
  it("says how many requests are new", () => {
    expect(requestsLabel(2)).toBe("Requests, 2 new");
    expect(requestsLabel(0)).toBe("Requests");
  });

  it("opens Profile against the friend", () => {
    expect(compareLink("user-avery")).toBe("/analytics?tab=profile&friend=user-avery");
  });
});
