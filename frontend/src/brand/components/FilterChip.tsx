import type { ReactNode } from "react";
import { colors } from "@/brand/theme";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  const { light: t } = colors;

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
        border: `1px solid ${active ? colors.primary : t.border}`,
        background: active ? colors.primary : t.card,
        color: active ? colors.onPrimary : t.fgMuted,
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
