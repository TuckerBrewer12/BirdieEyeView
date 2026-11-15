import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCopyText } from "../useCopyText";

class FakeClipboard {
  readonly written: string[] = [];
  private readonly refuse: boolean;
  constructor(refuse = false) {
    this.refuse = refuse;
  }
  writeText = async (text: string): Promise<void> => {
    if (this.refuse) throw new Error("Write permission denied.");
    this.written.push(text);
  };
}

describe("useCopyText", () => {
  it("puts the text on the clipboard and says it was copied", async () => {
    const clipboard = new FakeClipboard();
    const { result } = renderHook(() => useCopyText(clipboard));
    expect(result.current.copied).toBe(false);

    await act(() => result.current.copy("BIRD-1234"));

    expect(clipboard.written).toEqual(["BIRD-1234"]);
    expect(result.current.copied).toBe(true);
    expect(result.current.failed).toBe(false);
  });

  it("says it failed when the device turns the copy down", async () => {
    const { result } = renderHook(() => useCopyText(new FakeClipboard(true)));

    await act(() => result.current.copy("BIRD-1234"));

    expect(result.current.failed).toBe(true);
    expect(result.current.copied).toBe(false);
  });

  it("says it failed on a device with no clipboard", async () => {
    const { result } = renderHook(() => useCopyText(undefined));

    await act(() => result.current.copy("BIRD-1234"));

    expect(result.current.failed).toBe(true);
  });
});
