import { useState } from "react";
import { SearchField } from "@/brand/components/SearchField";

export default function SearchFieldPreview() {
  const [query, setQuery] = useState("Half Moon Bay");
  return (
    <>
      <SearchField placeholder="Search by course…" value="" onChange={() => {}} />
      <SearchField placeholder="Search by course…" value={query} onChange={setQuery} />
      <SearchField placeholder="Search courses…" value="peb" onChange={() => {}} loading />
    </>
  );
}
