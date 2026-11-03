import { useState } from "react";
import { SearchField } from "@/brand/components/SearchField";

export default function SearchFieldPreview() {
  const [query, setQuery] = useState("Half Moon");
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">Search · empty</p>
        <SearchField placeholder="Search courses" value="" onChange={() => {}} shortcut />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-semibold text-muted-foreground">Search · focused, with value</p>
        <SearchField placeholder="Search courses" value={query} onChange={setQuery} autoFocus shortcut />
      </div>
    </>
  );
}
