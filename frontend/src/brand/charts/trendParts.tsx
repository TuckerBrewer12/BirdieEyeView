import type { ReactNode } from "react";
import { tokens } from "@/brand/theme";

export function AxisLabel({
  x,
  y,
  anchor,
  children,
}: {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={tokens.type.body.size}
      fontWeight="600"
      fontFamily={tokens.font.sans}
      fill={tokens.color.chart.axis}
      paintOrder="stroke"
      stroke={tokens.color.card}
      strokeWidth={tokens.lineWidth.ring}
      strokeLinejoin="round"
    >
      {children}
    </text>
  );
}

export function TooltipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-card-foreground tabular-nums">{children}</span>
    </div>
  );
}
