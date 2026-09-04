import type { ReactNode } from "react";
import { useTheme } from "@/brand/theme";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  const theme = useTheme();

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 11px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        flexShrink: 0,
        cursor: "pointer",
        border: `1px solid ${active ? theme.primary : theme.border}`,
        background: active ? theme.primary : theme.card,
        color: active ? theme.onPrimary : theme.fgMuted,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export function FilterChipRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
      {children}
    </div>
  );
}
