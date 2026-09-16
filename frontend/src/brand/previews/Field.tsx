import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/brand/components/Field";
import { Input } from "@/brand/components/Input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/brand/components/InputGroup";

export default function FieldPreview() {
  const [revealed, setRevealed] = useState(false);

  return (
    <>
      <Field>
        <FieldLabel htmlFor="preview-email">Email</FieldLabel>
        <Input id="preview-email" type="email" placeholder="you@example.com" />
      </Field>

      <Field>
        <FieldLabel htmlFor="preview-course">Home course</FieldLabel>
        <Input
          id="preview-course"
          placeholder="Type course name…"
          aria-describedby="preview-course-description"
        />
        <FieldDescription id="preview-course-description">
          Leave it blank and set one later in Settings.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="preview-handicap">Handicap</FieldLabel>
        <Input
          id="preview-handicap"
          defaultValue="62"
          aria-invalid
          aria-describedby="preview-handicap-error"
        />
        <FieldError id="preview-handicap-error">
          Handicap must be between +10 and 54.
        </FieldError>
      </Field>

      {/* Password reveal composes out of InputGroup — no separate component. */}
      <Field>
        <FieldLabel htmlFor="preview-password">Password</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="preview-password"
            type={revealed ? "text" : "password"}
            defaultValue="birdie123"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label={revealed ? "Hide password" : "Show password"}
              aria-pressed={revealed}
              onClick={() => setRevealed((prev) => !prev)}
            >
              {revealed ? <EyeOff /> : <Eye />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Field>

      <Field>
        <FieldLabel htmlFor="preview-disabled">Email</FieldLabel>
        <Input id="preview-disabled" defaultValue="tiger@example.com" disabled />
      </Field>
    </>
  );
}
