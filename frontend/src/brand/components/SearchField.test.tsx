import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchField } from "./SearchField";

function Harness() {
  const [query, setQuery] = useState("Half Moon");
  return <SearchField aria-label="Search rounds" placeholder="Search" value={query} onChange={setQuery} />;
}

describe("SearchField", () => {
  it("clears its query and keeps the caret in the field", () => {
    render(<Harness />);
    const field = screen.getByRole("searchbox", { name: "Search rounds" });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });

  it("passes the input's own props through", () => {
    render(<SearchField aria-label="Find a course" placeholder="Find a course to link" value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText("Find a course to link")).toBeInTheDocument();
  });
});
