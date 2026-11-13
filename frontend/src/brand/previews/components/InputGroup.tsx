import { Search, Loader2 } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/brand/components/InputGroup";

export default function InputGroupPreview() {
  return (
    <>
      <InputGroup>
        <InputGroupInput placeholder="Search courses…" defaultValue="peb" />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <InputGroupInput placeholder="Search courses…" defaultValue="Half Moon" />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <Loader2 className="animate-spin" />
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <InputGroupInput placeholder="Search courses…" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton>Search</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup size="inline">
        <InputGroupInput placeholder="you@example.com" defaultValue="tiger@example.com" />
      </InputGroup>
    </>
  );
}
