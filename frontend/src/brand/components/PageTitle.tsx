import type { ReactNode } from "react";
import { useTheme } from "@/brand/theme";

export function PageTitle({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <div style={{ padding: "4px 0 0", fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: theme.fg }}>
      {children}
    </div>
  );
}
