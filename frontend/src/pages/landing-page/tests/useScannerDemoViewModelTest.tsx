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

describe("useScannerDemoViewModel", () => {
  it("starts on the photo the visitor is meant to recognise", () => {
    const { result } = renderHook(() => useScannerDemoViewModel());
    expect(result.current.phase).toBe("photo");
    expect(result.current.label).toBe("1. Snap a Photo");
  });

  it("walks the four steps and starts over", () => {
    const { result } = renderHook(() => useScannerDemoViewModel());

    advance(1000);
    expect(result.current.phase).toBe("mapping");

    advance(4000);
    expect(result.current.phase).toBe("scanning");

    advance(1500);
    expect(result.current.phase).toBe("result");

    advance(5000);
    expect(result.current.phase).toBe("photo");
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
