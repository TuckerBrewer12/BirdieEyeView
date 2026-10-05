import type { ReactNode } from "react";
import { useTheme } from "@/brand/theme";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "secondary" | "primary" | "danger";
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
  const background = variant === "danger" ? theme.danger : primary ? theme.primary : theme.card;
  const foreground = variant === "danger" ? theme.onDanger : primary ? theme.onPrimary : theme.fgMuted;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px",
        fontSize: 13,
        fontWeight: 600,
        color: foreground,
        background,
        border: `1px solid ${variant === "secondary" ? theme.border : background}`,
        borderRadius: 10,
        cursor: disabled ? "default" : "pointer",
        width: block ? "100%" : undefined,
      }}
    >
      {children}
    </button>
  );
}
