import type { ReactNode } from "react";
import { useTheme } from "@/brand/theme";

interface PanelProps {
  children: ReactNode;
  tone?: "default" | "info";
}

export function Panel({ children, tone = "default" }: PanelProps) {
  const theme = useTheme();
  const background = tone === "info" ? theme.infoFill : theme.card;
  const border = tone === "info" ? theme.infoBorder : theme.border;

  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${border}`,
        background,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}
