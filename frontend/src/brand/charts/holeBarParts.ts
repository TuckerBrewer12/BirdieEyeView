import type { ReactNode } from "react";
/** Recharts types its tooltip formatter loosely; each chart passes one of these. */
export type TooltipFormatter = (value: unknown, name: unknown, props: unknown) => ReactNode | [ReactNode, string];

/** "H3", for an axis whose holes are not in course order. */
export const holeLabel = (hole: number) => `H${hole}`;
