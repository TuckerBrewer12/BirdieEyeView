import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Field,
  FieldError,
  FieldLabel,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/brand";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  error?: string | null;
  revealName?: string;
  children?: ReactNode;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
  revealName = "password",
  children,
}: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const errorId = `${id}-error`;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup size="cta">
        <InputGroupInput
          id={id}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={`${revealed ? "Hide" : "Show"} ${revealName}`}
            aria-pressed={revealed}
            onClick={() => setRevealed((shown) => !shown)}
          >
            {revealed ? <EyeOff /> : <Eye />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldError id={errorId}>{error}</FieldError>
      {children}
    </Field>
  );
}
