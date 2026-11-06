import { useTheme } from "@/brand/theme";

interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortControlProps<T extends string> {
  label: string;
  value: T;
  options: SortOption<T>[];
  onChange: (value: T) => void;
  ascending: boolean;
  onToggleDirection: () => void;
  directionDisabled?: boolean;
}

export function SortControl<T extends string>({
  label,
  value,
  options,
  onChange,
  ascending,
  onToggleDirection,
  directionDisabled = false,
}: SortControlProps<T>) {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: theme.primary, pointerEvents: "none", paddingRight: 2 }}>
          {label}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={onToggleDirection}
        disabled={directionDisabled}
        style={{
          fontSize: 13, fontWeight: 700, color: theme.primary,
          background: "none", border: "none", padding: "2px 4px",
          cursor: directionDisabled ? "default" : "pointer",
          opacity: directionDisabled ? 0.4 : 1,
          lineHeight: 1,
        }}
      >
        {directionDisabled || ascending ? "↑" : "↓"}
      </button>
    </div>
  );
}
