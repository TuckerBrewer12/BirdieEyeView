import { useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";
import { Input } from "./Input";

interface SearchFieldProps {
  /** The input's id, so a FieldLabel can name it. */
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Names the field for screen readers; the placeholder when left off. */
  "aria-label"?: string;
  autoFocus?: boolean;
  loading?: boolean;
  /** Shows a `/` hint while the field is empty, and makes the `/` key focus it. */
  shortcut?: boolean;
  className?: string;
}

/** The field you type a query into: a search glyph, and a clear button once there is a value. */
export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  autoFocus,
  loading,
  shortcut = false,
  className,
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shortcut) return;
    const focusOnSlash = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", focusOnSlash);
    return () => document.removeEventListener("keydown", focusOnSlash);
  }, [shortcut]);

  const hasValue = value.length > 0;

  return (
    <label
      data-slot="search-field"
      className={cn(
        "group/search flex h-10 w-full min-w-0 cursor-text items-center gap-2.5 rounded-card border border-input bg-card pl-3 transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/20 dark:bg-input/30",
        hasValue ? "pr-1.5" : "pr-3",
        className,
      )}
    >
      <Search
        aria-hidden
        strokeWidth={tokens.stroke.icon}
        className={cn(
          "size-4 shrink-0 group-focus-within/search:text-foreground",
          hasValue ? "text-foreground" : "text-muted-foreground",
        )}
      />
      <Input
        ref={inputRef}
        id={id}
        type="search"
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="h-full flex-1 rounded-none border-0 bg-transparent p-0 text-foreground shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent [&::-webkit-search-cancel-button]:hidden"
      />
      {loading && <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-muted-foreground" />}
      {hasValue ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground-secondary outline-none hover:bg-secondary-hover focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X aria-hidden strokeWidth={tokens.stroke.icon} className="size-2.5" />
        </button>
      ) : (
        shortcut && (
          <kbd className="rounded-control border border-border px-1.5 py-px font-sans text-label font-semibold text-muted-foreground">
            /
          </kbd>
        )
      )}
    </label>
  );
}
