import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { tokens } from "@/brand/theme";
import { useLayoutTransition } from "./useLayoutTransition";

/**
 * A hole's number under its column, darker and bolder while its column is hovered. `moving` slides
 * it when the holes reorder, as a chart sorted hardest first does.
 */
export function HoleNumber({
  x,
  y,
  active,
  moving = false,
  children,
}: {
  x: number;
  y: number;
  active: boolean;
  moving?: boolean;
  children: ReactNode;
}) {
  const move = useLayoutTransition();
  const text = {
    y,
    textAnchor: "middle",
    fontSize: tokens.type.meta.size,
    fontFamily: tokens.font.sans,
    fontWeight: active ? "600" : "400",
    fill: active ? tokens.color.foreground : tokens.color.mutedForeground,
  } as const;
  return moving ? (
    <motion.text {...text} initial={false} animate={{ x }} transition={move}>
      {children}
    </motion.text>
  ) : (
    <text {...text} x={x}>
      {children}
    </text>
  );
}

/** The rule at the turn, where the back nine starts. */
export function NineDivider({ x, top, bottom }: { x: number; top: number; bottom: number }) {
  return <line x1={x} x2={x} y1={top} y2={bottom} stroke={tokens.color.border} strokeWidth={tokens.lineWidth.border} />;
}

/** The wash behind the hovered hole's column. */
export function HoleColumn({ x, width, top, bottom }: { x: number; width: number; top: number; bottom: number }) {
  return <rect x={x} y={top} width={width} height={bottom - top} rx={tokens.chart.holes.corner} fill={tokens.color.chart.grid} />;
}
