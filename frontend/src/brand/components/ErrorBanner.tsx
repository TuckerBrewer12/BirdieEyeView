import type { ReactNode } from "react";
import { useTheme } from "@/brand/theme";

export function ErrorBanner({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const color = theme.score.bogey.text;

  return (
    <div
      role="alert"
      style={{
        borderRadius: 12,
        border: `1px solid ${color}`,
        background: theme.card,
        padding: "10px 14px",
        fontSize: 13,
        color,
      }}
    >
      {children}
    </div>
  );
}
