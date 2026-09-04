export const colors = {
  primary: "#2d7a3a",
  onPrimary: "#ffffff",

  score: {
    eagle:  { fill: "#a16207", onFill: "#ffffff", text: "#a16207" },
    birdie: { fill: "#0b8a5e", onFill: "#ffffff", text: "#0b8a5e" },
    par:    { fill: "#e5e7eb", onFill: "#4b5563", text: "#9ca3af" },
    bogey:  { fill: "#ef4444", onFill: "#7f1d1d", text: "#dc2626" },
    double: { fill: "#3b78e0", onFill: "#ffffff", text: "#3b78e0" },
    triple: { fill: "#7c52e0", onFill: "#ffffff", text: "#7c52e0" },
    quad:   { fill: "#6d28d9", onFill: "#ffffff", text: "#6d28d9" },
  },

  light: {
    page: "#f8faf8",
    fg: "#1a2e1a",
  },
  dark: {
    page: "#111213",
    fg: "#e6edf3",
  },
} as const;
