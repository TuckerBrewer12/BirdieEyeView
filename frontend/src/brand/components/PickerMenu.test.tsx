import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { PickerMenu } from "./PickerMenu";

const OPTIONS = [
  { value: "date", label: "Date" },
  { value: "score", label: "Score" },
] as const;

describe("PickerMenu", () => {
  it("draws one trigger, disabled while a pick saves", () => {
    render(
      <PickerMenu aria-label="Sort by" label="Date" value="date" options={OPTIONS} onChange={new FakeHandler().handle} disabled />,
    );
    const triggers = screen.getAllByRole("button", { name: "Sort by" });
    expect(triggers).toHaveLength(1);
    expect(triggers[0]).toBeDisabled();
  });

  it("names the phone's icon trigger by what it picks and the pick", () => {
    render(
      <PickerMenu
        aria-label="Sort by"
        label="Newest"
        value="date"
        options={OPTIONS}
        onChange={new FakeHandler().handle}
        compactIcon={<span />}
      />,
    );
    expect(screen.getByRole("button", { name: "Sort by: Newest" })).toBeEnabled();
  });

  it("puts the phone's shorter words on its trigger", () => {
    render(
      <PickerMenu
        aria-label="Course"
        label="All courses"
        compactLabel="Course"
        value="date"
        options={OPTIONS}
        onChange={new FakeHandler().handle}
      />,
    );
    expect(screen.getByRole("button", { name: "Course" })).toHaveTextContent("Course");
  });
});
