import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { downloadDataUrl } from "@/platform/downloadDataUrl";

/** What goes out with the image: the share sheet's title and text, or the download's name. */
export interface ShareMessage {
  title: string;
  text: string;
  fileName: string;
}

/**
 * Shares the element behind `cardRef` as a PNG: through the share sheet where the browser
 * has one, else as a download.
 */
export function useShareRound() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const share = useCallback(async (message: ShareMessage) => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "round.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: message.title, text: message.text });
      } else {
        downloadDataUrl(dataUrl, message.fileName);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    } finally {
      setSharing(false);
    }
  }, []);

  return { cardRef, share, sharing };
}
