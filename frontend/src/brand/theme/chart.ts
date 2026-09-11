import type { CSSProperties } from "react";
import { colors } from "./colors";

/**
 * Recharts `contentStyle`. Chart libraries take a style object, so they cannot
 * use Tailwind classes — this is the same path as `colors.card` in a fill.
 * Surfaces, border, and shadow are the existing kit tokens, not a new palette.
 */
export const chartTooltipStyle: CSSProperties = {
  fontSize: 12,
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  boxShadow: "var(--shadow-card)",
  background: colors.card,
};
