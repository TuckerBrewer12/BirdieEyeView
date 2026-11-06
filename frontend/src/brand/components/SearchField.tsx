import { useEffect, useId, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import {
  InputGroup,
  InputGroupAddonLabel,
  InputGroupInput,
} from "./InputGroup";

interface SearchFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * Puts the caret in the field when it appears. Only for a field the golfer just opened (a panel,
   * a "Change course"), never one that is there when the page loads.
   */
  focusOnOpen?: boolean;
  loading?: boolean;
}

export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  focusOnOpen = false,
  loading,
}: SearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnOpen) input.current?.focus();
  }, [focusOnOpen]);

  return (
    <InputGroup>
      <InputGroupInput
        ref={input}
        id={inputId}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <InputGroupAddonLabel htmlFor={inputId}>
        <Search />
      </InputGroupAddonLabel>
      {loading && (
        <InputGroupAddonLabel htmlFor={inputId} align="inline-end">
          <Loader2 className="animate-spin" />
        </InputGroupAddonLabel>
      )}
    </InputGroup>
  );
}
