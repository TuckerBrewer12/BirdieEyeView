/** The avatar fills: the brand green, then four fixed hues that read on a card in either mode. */
const personAvatarFills = [
  "bg-primary text-primary-foreground",
  "bg-status-info-base text-status-info-on-base",
  "bg-score-triple-base text-score-triple-on-base",
  "bg-score-eagle-base text-score-eagle-on-base",
  "bg-status-danger-base text-status-danger-on-base",
] as const;

export { personAvatarFills };
