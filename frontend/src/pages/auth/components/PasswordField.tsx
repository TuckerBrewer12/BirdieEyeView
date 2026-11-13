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
  /** Why this password can't be sent; shown under the field and announced. */
  error?: string | null;
  /** What the reveal button shows, for its name: "Show password", "Show confirm password". */
  revealName?: string;
  /** A link at the end of the label's row: sign in's "Forgot?". */
  labelAction?: ReactNode;
  /** Marks the field wrong without a message of its own, as a refused sign-in does. */
  invalid?: boolean;
  children?: ReactNode;
}

/**
 * A password input with a button that shows what was typed. Whether it is showing is the
 * field's own business, so the view model never hears about it.
 */
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
          aria-describedby={error ? errorId : undefined}
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
