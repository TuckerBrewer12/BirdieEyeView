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
  labelAction?: ReactNode;
  invalid?: boolean;
  describedBy?: string;
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
  labelAction,
  invalid = false,
  describedBy,
  children,
}: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const errorId = `${id}-error`;

  return (
    <Field>
      {labelAction != null ? (
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {labelAction}
        </div>
      ) : (
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
      )}
      <InputGroup>
        <InputGroupInput
          id={id}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error != null || invalid ? true : undefined}
          aria-describedby={error ? errorId : describedBy}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-lg"
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
