import { X } from "lucide-react";
import { useTheme } from "@/brand/theme";

export function CustomNameChip({ name, onClear }: { name: string; onClear: () => void }) {
  const theme = useTheme();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        background: theme.mutedFill,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
      }}
    >
      <span style={{ fontSize: 13, color: theme.fg, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        Saving as: <span style={{ fontWeight: 600 }}>{name}</span>
      </span>
      <button
        type="button"
        onClick={onClear}
        title="Edit name"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: theme.fgMuted, flexShrink: 0, display: "flex" }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
