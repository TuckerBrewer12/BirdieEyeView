import type * as React from "react";
import { useEffect, useId, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@/brand/cn";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupAddonLabel,
  InputGroupButton,
  InputGroupInput,
} from "./InputGroup";

/** Other input props (an `id` for a FieldLabel, combobox ARIA, `onKeyDown`) go to the input. */
interface SearchFieldProps
  extends Omit<React.ComponentProps<typeof InputGroupInput>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
  /**
   * Puts the caret in the field when it appears. Only for a field the golfer just opened (a panel,
   * a "Change course"), never one that is there when the page loads.
   */
  focusOnOpen?: boolean;
  loading?: boolean;
  /** Shows a `/` hint while the field is empty, and makes the `/` key focus it. */
  shortcut?: boolean;
}

export function SearchField({
  id,
  value,
  onChange,
  focusOnOpen = false,
  loading,
  shortcut = false,
  ...inputProps
}: SearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnOpen) input.current?.focus();
  }, [focusOnOpen]);

  useEffect(() => {
    if (!shortcut) return;
    const focusOnSlash = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", focusOnSlash);
    return () => document.removeEventListener("keydown", focusOnSlash);
  }, [shortcut]);

  return (
    <InputGroup className="bg-card">
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
      {value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            variant="secondary"
            aria-label="Clear search"
            onClick={() => {
              onChange("");
              input.current?.focus();
            }}
          >
            <X className="size-3.5" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : (
        shortcut && (
          <InputGroupAddon align="inline-end">
            <kbd className="border border-border px-1.5 text-label font-semibold">/</kbd>
          </InputGroupAddon>
        )
      )}
    </InputGroup>
  );
}
