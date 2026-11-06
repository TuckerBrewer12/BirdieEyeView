import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useScannerDemoViewModel } from "../components/useScannerDemoViewModel";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Each step's timer is set once the last one has rendered, so steps pass one at a time. */
function advanceSteps(...holds: number[]) {
  for (const hold of holds) advance(hold);
}

describe("useScannerDemoViewModel", () => {
  it("starts on the photo the visitor is meant to recognise", () => {
    const { result } = renderHook(() => useScannerDemoViewModel());
    expect(result.current.phase).toBe("photo");
    expect(result.current.label).toBe("1. Snap a photo");
  });

  it("labels each hole of the sample card with how it was scored", () => {
    const { result } = renderHook(() => useScannerDemoViewModel());
    expect(result.current.scorecard.map((row) => row.score)).toEqual([
      "bogey", "bogey", "par", "bogey", "bogey", "bogey", "bogey", "bogey", "bogey",
    ]);
  });

  it("walks the scan, tours the app it lands in, and starts over", () => {
    const { result } = renderHook(() => useScannerDemoViewModel());
    const seen = [result.current.phase];
    for (const hold of [1000, 4000, 1500, 4000, 2500, 1000, 3000, 3000, 3000]) {
      advanceSteps(hold);
      seen.push(result.current.phase);
    }
    expect(seen).toEqual([
      "photo", "mapping", "scanning", "result",
      "dashboard", "handicapTap", "handicap", "analytics", "lab",
      "photo",
    ]);
  });

  it("shows no app screen until the scan has landed", () => {
    const { result } = renderHook(() => useScannerDemoViewModel());
    expect(result.current.screen).toBeNull();
    advanceSteps(1000, 4000, 1500);
    expect(result.current.phase).toBe("result");
    expect(result.current.screen).toBeNull();
    advance(4000);
    expect(result.current.screen).toBe("dashboard");
    expect(result.current.tapping).toBe(false);
  });

  it("taps the handicap on the dashboard before opening its breakdown", () => {
    const { result } = renderHook(() => useScannerDemoViewModel());
    advanceSteps(1000, 4000, 1500, 4000, 2500);
    expect(result.current.screen).toBe("dashboard");
    expect(result.current.tapping).toBe(true);
    advance(1000);
    expect(result.current.screen).toBe("handicap");
    expect(result.current.tapping).toBe(false);
  });

  it("starts loading the tour once the round is on show, not with the page", () => {
    const { result } = renderHook(() => useScannerDemoViewModel());
    expect(result.current.tourPrimed).toBe(false);
    advanceSteps(1000, 4000);
    expect(result.current.tourPrimed).toBe(false);
    advance(1500);
    expect(result.current.tourPrimed).toBe(true);
  });

  it("holds each step for its own time, not a shared one", () => {
    const { result } = renderHook(() => useScannerDemoViewModel());

    // The mapping panel is dense, so it is given four seconds where the photo
    // gets one. Advancing by the photo's hold must not move it on.
    advance(1000);
    expect(result.current.phase).toBe("mapping");
    advance(1000);
    expect(result.current.phase).toBe("mapping");
  });
});
