import { describe, expect, it } from "vitest";
import { isCurrent, navigationFor } from "../navigation";

const activeLabels = (items: { label: string; active?: boolean }[]) =>
  items.filter((item) => item.active).map((item) => item.label);

describe("isCurrent", () => {
  it("matches home only on home", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/rounds", "/")).toBe(false);
  });

  it("matches a section and the pages under it", () => {
    expect(isCurrent("/rounds", "/rounds")).toBe(true);
    expect(isCurrent("/rounds/round-3", "/rounds")).toBe(true);
  });

  it("does not match a section that only shares a prefix", () => {
    expect(isCurrent("/roundsabc", "/rounds")).toBe(false);
  });
});

describe("navigationFor", () => {
  it("lights the round's section in every nav on a round's page", () => {
    const nav = navigationFor("/rounds/round-3");
    expect(activeLabels(nav.side)).toEqual(["Rounds"]);
    expect(activeLabels(nav.tabs)).toEqual(["Rounds"]);
    expect(activeLabels(nav.more)).toEqual([]);
  });

  it("lights Settings in the rail's footer and the More menu", () => {
    const nav = navigationFor("/settings");
    expect(activeLabels(nav.side)).toEqual([]);
    expect(activeLabels(nav.sideFooter)).toEqual(["Settings"]);
    expect(activeLabels(nav.tabs)).toEqual([]);
    expect(activeLabels(nav.more)).toEqual(["Settings"]);
  });

  it("lights Dashboard and Home on /", () => {
    const nav = navigationFor("/");
    expect(activeLabels(nav.side)).toEqual(["Dashboard"]);
    expect(activeLabels(nav.tabs)).toEqual(["Home"]);
  });
});
