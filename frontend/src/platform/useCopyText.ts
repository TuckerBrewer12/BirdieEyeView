import { useCallback, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

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
