import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
} from "@/brand";

interface HandicapSectionProps {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}

const ID = "settings-handicap";

export function HandicapSection({ value, error, onChange }: HandicapSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Handicap</CardTitle>
        <CardDescription>Set your handicap index by hand.</CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor={ID}>Manual handicap index</FieldLabel>
          <Input
            id={ID}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. +5.0"
            aria-invalid={error != null}
            aria-describedby={error ? `${ID}-error` : `${ID}-description`}
          />
          {error ? (
            <FieldError id={`${ID}-error`}>{error}</FieldError>
          ) : (
            <FieldDescription id={`${ID}-description`}>
              Leave it blank to clear it. Allowed range: +10 through 54.
            </FieldDescription>
          )}
        </Field>
      </CardContent>
    </Card>
  );
}
