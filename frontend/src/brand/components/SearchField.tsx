import { useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@/brand/cn";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
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
  /** Shows a `/` hint while the field is empty, and makes the `/` key focus it. */
  shortcut?: boolean;
}

export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  loading,
  shortcut = false,
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
    <InputGroup className="h-10 rounded-card bg-card">
      <InputGroupInput
        ref={inputRef}
        id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="[&::-webkit-search-cancel-button]:hidden"
      />
      <InputGroupAddon className={cn("pl-3", value && "text-foreground")}>
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
            className="size-7 text-foreground-secondary"
          >
            <X className="size-3.5" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : (
        shortcut && (
          <InputGroupAddon align="inline-end" className="pr-3">
            <kbd className="border border-border px-1.5 text-label font-semibold">/</kbd>
          </InputGroupAddon>
        )
      )}
    </InputGroup>
  );
}
