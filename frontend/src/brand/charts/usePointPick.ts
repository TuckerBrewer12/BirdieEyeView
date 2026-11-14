import { useState, type PointerEvent } from "react";
import type { ColumnScale } from "./useColumnHover";

export function usePointPick() {
  const [active, setActive] = useState<number | null>(null);
  const track = (x: ColumnScale, count: number, width: number) => {
    const indexAt = (e: PointerEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const index = Math.round(x.invert((e.clientX - rect.left) * (width / rect.width)));
      return Math.max(0, Math.min(count - 1, index));
    };
    return {
      onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
        if (e.pointerType === "mouse") setActive(indexAt(e));
      },
      onPointerLeave: (e: PointerEvent<SVGSVGElement>) => {
        if (e.pointerType === "mouse") setActive(null);
      },
      onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
        if (e.pointerType === "mouse") return;
        const index = indexAt(e);
        setActive(active === index ? null : index);
      },
    };
  };
  return { active, track };
}
