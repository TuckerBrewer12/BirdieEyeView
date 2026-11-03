import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { borderWidth, type } from "./theme/tokens";

/**
 * The kit's `text-*` type roles are font sizes, not colors. Without this,
 * `text-body-sm` collides with `text-primary-foreground` and a primary sm
 * button loses its white label. Likewise `border-callout` is a border width,
 * not a colour, so `border-status-info` beside it does not drop it.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: Object.keys(type) }],
      "border-w": [{ border: Object.keys(borderWidth) }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
