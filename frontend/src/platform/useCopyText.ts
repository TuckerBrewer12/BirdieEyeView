import { useCallback, useState } from "react";

/** Where the last copy stands: not tried yet, on the clipboard, or turned down by the device. */
export type CopyState = "idle" | "copied" | "failed";

/**
 * Puts text on the device's clipboard, and says whether it went. Views call this rather than the
 * browser's clipboard, so the native app can answer it its own way (a Capacitor clipboard plugin)
 * without touching a page. `clipboard` is for tests; the app uses the browser's.
 */
export function useCopyText(clipboard: Pick<Clipboard, "writeText"> | undefined = globalThis.navigator?.clipboard) {
  const [state, setState] = useState<CopyState>("idle");

  const copy = useCallback(
    async (text: string) => {
      try {
        if (clipboard == null) throw new Error("No clipboard on this device.");
        await clipboard.writeText(text);
        setState("copied");
      } catch {
        setState("failed");
      }
    },
    [clipboard],
  );

  return { copy, copied: state === "copied", failed: state === "failed" };
}
