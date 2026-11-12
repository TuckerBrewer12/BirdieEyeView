import type * as React from "react";
import { useEffect, useId, useRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/brand/cn";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupAddonLabel,
  InputGroupButton,
  InputGroupInput,
} from "./InputGroup";

/** Other input props (a placeholder, an `aria-label`, combobox ARIA, `onKeyDown`) go to the input. */
interface SearchFieldProps
  extends Omit<React.ComponentProps<typeof InputGroupInput>, "value" | "onChange" | "type" | "size"> {
  value: string;
  onChange: (value: string) => void;
  /**
   * Puts the caret in the field when it appears. Only for a field the golfer just opened (a panel,
   * a "Change course"), never one that is there when the page loads.
   */
  focusOnOpen?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * Search, as the pages show it: 40 tall on the card's surface, a magnifier that darkens once
 * there's a query, and a button that clears it and keeps the caret in the field.
 */
export function SearchField({
  id,
  value,
  onChange,
  focusOnOpen = false,
  loading,
  className,
  ...inputProps
}: SearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnOpen) input.current?.focus();
  }, [focusOnOpen]);

  return (
    <InputGroup size="inline" className={className}>
      <InputGroupInput
        ref={input}
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="[&::-webkit-search-cancel-button]:hidden"
        {...inputProps}
      />
      <InputGroupAddonLabel htmlFor={inputId} className={cn(value && "text-foreground")}>
        <Search />
      </InputGroupAddonLabel>
      {loading && (
        <InputGroupAddonLabel htmlFor={inputId} align="inline-end">
          <Loader2 className="animate-spin" />
        </InputGroupAddonLabel>
      )}
      {value && !loading && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            variant="secondary"
            className="size-7"
            aria-label="Clear search"
            onClick={() => {
              onChange("");
              input.current?.focus();
            }}
          >
            <X className="size-3.5" />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
