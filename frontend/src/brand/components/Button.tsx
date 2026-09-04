import type { ReactNode } from "react";
import { useTheme } from "@/brand/theme";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "secondary" | "primary";
  disabled?: boolean;
  block?: boolean;
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "secondary",
  disabled,
  block,
}: ButtonProps) {
  const theme = useTheme();
  const primary = variant === "primary";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px",
        fontSize: 13,
        fontWeight: 600,
        color: primary ? theme.onPrimary : theme.fgMuted,
        background: primary ? theme.primary : theme.card,
        border: `1px solid ${primary ? theme.primary : theme.border}`,
        borderRadius: 10,
        cursor: disabled ? "default" : "pointer",
        width: block ? "100%" : undefined,
      }}
    >
      {children}
    </button>
  );
}
