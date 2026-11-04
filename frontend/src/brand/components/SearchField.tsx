import type * as React from "react";
import { useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@/brand/cn";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./InputGroup";

/** Other input props (an `id` for a FieldLabel, combobox ARIA, `onKeyDown`) go to the input. */
interface SearchFieldProps
  extends Omit<React.ComponentProps<typeof InputGroupInput>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  /** Shows a `/` hint while the field is empty, and makes the `/` key focus it. */
  shortcut?: boolean;
}

export function SearchField({
  value,
  onChange,
  loading,
  shortcut = false,
  ...inputProps
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shortcut) return;
    const focusOnSlash = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", focusOnSlash);
    return () => document.removeEventListener("keydown", focusOnSlash);
  }, [shortcut]);

  return (
    <InputGroup size="inline" className="bg-card">
      <InputGroupInput
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="[&::-webkit-search-cancel-button]:hidden"
        {...inputProps}
      />
      <InputGroupAddon className={cn(value && "text-foreground")}>
        <Search />
      </InputGroupAddon>
      {loading && (
        <InputGroupAddon align="inline-end">
          <Loader2 className="animate-spin" />
        </InputGroupAddon>
      )}
      {value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            variant="secondary"
            aria-label="Clear search"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
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
