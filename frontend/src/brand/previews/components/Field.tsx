import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/brand/components/Field";
import { Input } from "@/brand/components/Input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/brand/components/InputGroup";

function Caption({ children }: { children: ReactNode }) {
  return <div className="text-label font-semibold text-muted-foreground">{children}</div>;
}

export default function FieldPreview() {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      data-testid="brand-frame"
      className="fixed inset-0 grid grid-cols-2 gap-4 overflow-auto bg-background p-6"
    >
      <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-1.5">
          <Field>
            <FieldLabel htmlFor="preview-email">Email</FieldLabel>
            <Input id="preview-email" type="text" defaultValue="test@example.com" />
          </Field>
          <Caption>Default</Caption>
        </div>

        <div className="flex flex-col gap-1.5">
          <Field>
            <FieldLabel htmlFor="preview-name">Name on scorecard</FieldLabel>
            {/* Focus is the browser's own :focus-visible; the screenshot spec focuses it. */}
            <Input id="preview-name" type="text" defaultValue="Tuck" />
          </Field>
          <Caption>Focused</Caption>
        </div>

        {/* Password reveal composes out of InputGroup, no separate component. */}
        <Field>
          <FieldLabel htmlFor="preview-password">Password</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="preview-password"
              type={revealed ? "text" : "password"}
              defaultValue="hunter22"
              aria-invalid
              aria-describedby="preview-password-error"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-lg"
                aria-label={revealed ? "Hide password" : "Show password"}
                aria-pressed={revealed}
                onClick={() => setRevealed((prev) => !prev)}
              >
                {revealed ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldError id="preview-password-error">Email or password is wrong</FieldError>
        </Field>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5">
          <Field>
            <FieldLabel htmlFor="preview-handicap">Handicap index</FieldLabel>
            <Input
              id="preview-handicap"
              type="text"
              defaultValue="8.4"
              aria-describedby="preview-handicap-description"
            />
            <FieldDescription id="preview-handicap-description">
              +10 to 54. Leave blank to calculate from rounds.
            </FieldDescription>
          </Field>
          <div className="mt-1.5">
            <Caption>With help text</Caption>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex min-h-14 items-center gap-3 px-4">
              <label htmlFor="preview-handicap-inline" className="flex-1 text-body-lg font-medium">
                Handicap index
              </label>
              <Input
                id="preview-handicap-inline"
                size="inline"
                type="text"
                defaultValue="8.4"
                className="w-22 text-right"
              />
            </div>
          </div>
          <Caption>Inline · inside a settings row</Caption>
        </div>
      </div>
    </div>
  );
}
