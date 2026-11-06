import type { ReactNode } from "react";
export type TooltipFormatter = (value: unknown, name: unknown, props: unknown) => ReactNode | [ReactNode, string];

export const holeLabel = (hole: number) => `H${hole}`;
