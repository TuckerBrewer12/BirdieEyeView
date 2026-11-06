import { describe, expect, it } from "vitest";
import { indexScale, knownValues, lastKnownIndex, paddedExtent } from "./scales";

describe("chart scales", () => {
  it("skips missing values", () => {
    expect(knownValues([3, null, 5, undefined])).toEqual([3, 5]);
    expect(lastKnownIndex([3, 5, null])).toBe(1);
    expect(lastKnownIndex([null])).toBe(-1);
  });

  it("pads a range by a fixed amount or a share of its span", () => {
    expect(paddedExtent([70, null, 80], 5)).toEqual([65, 85]);
    expect(paddedExtent([70, 80], { ratio: 0.1 })).toEqual([69, 81]);
    expect(paddedExtent([], 5)).toBeNull();
  });

  it("gives a flat run headroom", () => {
    expect(paddedExtent([72, 72], { ratio: 0.5 })).toEqual([71.5, 72.5]);
  });

  it("spreads indexes from the left edge to the right", () => {
    const x = indexScale(5, 10, 50);
    expect([x(0), x(2), x(4)]).toEqual([10, 30, 50]);
  });
});
