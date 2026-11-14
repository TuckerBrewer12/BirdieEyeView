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

interface SearchFieldProps
  extends Omit<React.ComponentProps<typeof InputGroupInput>, "value" | "onChange" | "type" | "size"> {
  value: string;
  onChange: (value: string) => void;
  focusOnOpen?: boolean;
  loading?: boolean;
  className?: string;
}

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
