import { Field, FieldLabel, Input, TeePicker } from "@/brand";
import type { TeeChoice } from "@/domain";

interface TeeFieldProps {
  /** The input's id, when the tee is typed. */
  id: string;
  /** The tees to pick from: the course's or the card's. None, and the tee is typed. */
  tees: readonly TeeChoice[];
  teeBox: string;
  setTeeBox: (teeBox: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** The tee played: picked from the tees there are, or typed when there are none. */
export function TeeField({ id, tees, teeBox, setTeeBox, placeholder = "e.g. White", disabled }: TeeFieldProps) {
  const pick = tees.length > 0;
  return (
    <Field>
      <FieldLabel htmlFor={pick ? undefined : id}>Tee</FieldLabel>
      {pick ? (
        <TeePicker tees={tees} value={teeBox} onChange={setTeeBox} hideLabel />
      ) : (
        <Input
          id={id}
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          value={teeBox}
          onChange={(e) => setTeeBox(e.target.value)}
        />
      )}
    </Field>
  );
}
