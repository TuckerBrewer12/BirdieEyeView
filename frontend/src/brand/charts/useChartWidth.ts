import { useCallback, useState } from "react";

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
