import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { type } from "./theme/tokens";

/**
 * The kit's `text-*` type roles are font sizes, not colors. Without this,
 * `text-body-sm` collides with `text-primary-foreground` and a primary sm
 * button loses its white label.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: Object.keys(type) }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
