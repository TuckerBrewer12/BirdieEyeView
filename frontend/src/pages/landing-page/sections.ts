export const LANDING_SECTIONS = {
  howItWorks: "how-it-works",
  tryItOut: "try-it-out",
} as const;

export function scrollToLandingSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
