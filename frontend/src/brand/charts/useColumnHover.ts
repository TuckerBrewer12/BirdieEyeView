import { useState, type MouseEvent } from "react";

export type ColumnScale = { invert: (pixels: number) => number };

export function useColumnHover() {
  const [hovered, setHovered] = useState<number | null>(null);
  const track = (x: ColumnScale, first: number, last: number, width: number) => ({
    onMouseMove: (e: MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const at = Math.floor(x.invert((e.clientX - rect.left) * (width / rect.width)));
      setHovered(Math.max(first, Math.min(last, at)));
    },
    onMouseLeave: () => setHovered(null),
  });
  return { hovered, track };
}
