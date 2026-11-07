import { useState } from "react";
import { SearchField } from "@/brand/components/SearchField";

/** Laid out as the board is, two fields across: capture it in a 760px-wide window. */
export default function SearchFieldPreview() {
  const [query, setQuery] = useState("Half Moon");
  return (
    <div
      data-testid="brand-frame"
      className="fixed inset-0 grid grid-cols-2 content-start gap-4 overflow-auto bg-background p-6"
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">Search · empty</p>
        <SearchField placeholder="Search courses" value="" onChange={() => {}} shortcut />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">Search · focused, with value</p>
        <SearchField placeholder="Search courses" value={query} onChange={setQuery} focusOnOpen shortcut />
      </div>
    </div>
  );
}
