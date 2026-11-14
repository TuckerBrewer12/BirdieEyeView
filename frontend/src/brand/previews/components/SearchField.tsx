import { useState } from "react";
import { SearchField } from "@/brand/components/SearchField";

export default function SearchFieldPreview() {
  const [query, setQuery] = useState("Half Moon");
  return (
    <>
      <SearchField placeholder="Search" aria-label="Search rounds" value="" onChange={() => {}} />
      <SearchField placeholder="Search" aria-label="Search rounds" value={query} onChange={setQuery} />
      <SearchField placeholder="Search courses" aria-label="Search courses" value="peb" onChange={() => {}} loading />
    </>
  );
}
