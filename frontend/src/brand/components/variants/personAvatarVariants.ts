import { cva } from "class-variance-authority";

/** The avatar fills: the brand green, then four fixed hues that read on a card in either mode. */
const personAvatarVariants = cva("", {
  variants: {
    tone: {
      primary: "bg-primary text-primary-foreground",
      info: "bg-status-info-base text-status-info-on-base",
      triple: "bg-score-triple-base text-score-triple-on-base",
      eagle: "bg-score-eagle-base text-score-eagle-on-base",
      danger: "bg-status-danger-base text-status-danger-on-base",
    },
  },
  defaultVariants: {
    tone: "primary",
  },
});

export { personAvatarVariants };
