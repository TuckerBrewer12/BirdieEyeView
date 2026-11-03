import { Search, Loader2 } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "./InputGroup";

interface SearchFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  loading?: boolean;
}

export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  loading,
}: SearchFieldProps) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
