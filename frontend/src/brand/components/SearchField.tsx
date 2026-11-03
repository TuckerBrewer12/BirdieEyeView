import { type KeyboardEvent } from "react";
import { Search, Loader2 } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "./InputGroup";

interface SearchFieldProps {
  /** The input's id, so a FieldLabel can name it. */
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  loading?: boolean;
  /** Combobox wiring, when the field drives a listbox. */
  role?: "combobox";
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-activedescendant"?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  loading,
  role,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
  "aria-activedescendant": ariaActiveDescendant,
  onKeyDown,
}: SearchFieldProps) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        type="search"
        role={role}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-activedescendant={ariaActiveDescendant}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      {loading && (
        <InputGroupAddon align="inline-end">
          <Loader2 className="animate-spin" />
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
