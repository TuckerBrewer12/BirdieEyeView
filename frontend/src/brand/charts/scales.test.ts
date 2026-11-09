import { describe, expect, it } from "vitest";
import { indexScale, knownValues, lastKnownIndex, niceExtent, paddedExtent, steppedExtent, stepsWithin } from "./scales";

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

  it("widens a range out to round steps", () => {
    expect(niceExtent([74, 88, 72], 5, 2)).toEqual([70, 90]);
    expect(niceExtent([9.8, 12.5], 3, 0.5)).toEqual([9, 13]);
    expect(niceExtent([72, 72], 3, 1)).toEqual([71, 73]);
    expect(niceExtent([null], 5, 2)).toBeNull();
  });

  it("steps a range out to the step below and above, and grids it", () => {
    expect(steppedExtent([85, 69, 72, 78, 80], 5, 10)).toEqual([65, 90]);
    expect(steppedExtent([14, 12.4, null], 1, 1)).toEqual([12, 14]);
    expect(steppedExtent([80], 5, 10)).toEqual([80, 90]);
    expect(steppedExtent([null], 5, 10)).toBeNull();
    expect(stepsWithin([65, 90], 10)).toEqual([70, 80, 90]);
    expect(stepsWithin([12, 15], 1)).toEqual([13, 14, 15]);
  });
});
