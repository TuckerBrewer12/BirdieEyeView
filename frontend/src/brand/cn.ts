import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Custom `text-*` utilities from tokens.css are font sizes, not colors.
 * Without this, `text-button-sm` collides with `text-primary-foreground`
 * and a primary sm button loses its white label.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "caption",
            "meta",
            "label",
            "body-sm",
            "body",
            "button-sm",
            "title",
            "hero",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
