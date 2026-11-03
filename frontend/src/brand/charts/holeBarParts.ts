import type { ReactNode } from "react";
import { chartColors, chartTickStyle } from "@/brand/theme";

export const AXIS_TICK = { ...chartTickStyle, fill: chartColors.axis };

export type TooltipFormatter = (value: unknown, name: unknown, props: unknown) => ReactNode | [ReactNode, string];

export const holeLabel = (hole: number) => `H${hole}`;
