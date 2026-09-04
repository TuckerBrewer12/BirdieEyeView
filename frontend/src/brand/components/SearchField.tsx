import { Search } from "lucide-react";
import { colors } from "@/brand/theme";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  const { light: t } = colors;

  return (
    <div style={{ position: "relative" }}>
      <Search
        size={14}
        color={t.fgMuted}
        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 36,
          paddingLeft: 34,
          paddingRight: 12,
          fontSize: 13,
          color: t.fg,
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 99,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
