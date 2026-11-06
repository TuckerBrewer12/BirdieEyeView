import { CheckCircle, X } from "lucide-react";
import { useTheme } from "@/brand/theme";

export function CourseLinkChip({ name, onClear }: { name: string; onClear: () => void }) {
  const theme = useTheme();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        background: theme.primary,
        border: `1px solid ${theme.primary}`,
        borderRadius: 10,
      }}
    >
      <CheckCircle size={14} color={theme.onPrimary} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: theme.onPrimary, flex: 1 }}>
        Linked: {name}
      </span>
      <button
        type="button"
        onClick={onClear}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: theme.onPrimary, opacity: 0.7, display: "flex" }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
