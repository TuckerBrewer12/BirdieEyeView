import { useCallback, useState } from "react";

/**
 * The width a chart has to draw in, measured off its box, so it draws at that width and its labels keep
 * their size: `fallback` until the box is measured, never less than `min` (below it the chart scrolls).
 * Pass the returned ref to the box.
 */
export function useChartWidth(fallback: number, min: number): [number, (node: HTMLDivElement | null) => void] {
  const [measured, setMeasured] = useState<number | null>(null);
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setMeasured(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [Math.max(min, measured ?? fallback), measure];
}
