import { Bar, Cell } from "recharts";
import { chartLayout, toParFill } from "@/brand/theme";
type ToParRow = { hole_number: number; average_to_par: number };

/** One bar per hole. The row carries average to-par; the bar paints the score. */
export function ToParBars({ rows }: { rows: ToParRow[] }) {
  return (
    <Bar dataKey="average_to_par" radius={chartLayout.barRadius} isAnimationActive={false}>
      {rows.map((row) => (
        <Cell key={row.hole_number} fill={toParFill(row.average_to_par)} />
      ))}
    </Bar>
  );
}
