import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { SettingsRow } from "./SettingsRow";

describe("SettingsRow", () => {
  it("toggles a switch from its label", () => {
    const onCheckedChange = new FakeHandler<[boolean]>();
    render(
      <SettingsRow type="switch" label="Get updates" checked={false} onCheckedChange={onCheckedChange.handle} />,
    );
    expect(screen.getByRole("switch", { name: "Get updates" })).not.toBeChecked();
    fireEvent.click(screen.getByText("Get updates"));
    expect(onCheckedChange.calls[0]?.[0]).toBe(true);
  });

  it("marks the chosen option and changes it", () => {
    const onValueChange = new FakeHandler<[string]>();
    render(
      <SettingsRow
        type="choose"
        label="Theme"
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        value="light"
        onValueChange={onValueChange.handle}
      />,
    );
    const group = screen.getByRole("group", { name: "Theme" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(onValueChange.calls).toEqual([["dark"]]);
  });

  it("keeps the chosen option when it is pressed again", () => {
    const onValueChange = new FakeHandler<[string]>();
    render(
      <SettingsRow
        type="choose"
        label="Theme"
        options={[{ value: "light", label: "Light" }]}
        value="light"
        onValueChange={onValueChange.handle}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(onValueChange.calls).toEqual([]);
  });

  it("copies, then says it copied", () => {
    const onCopy = new FakeHandler();
    const { rerender } = render(
      <SettingsRow type="copy" label="Friend code" value="BIRD-1234" onCopy={onCopy.handle} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onCopy.calls).toHaveLength(1);
    rerender(<SettingsRow type="copy" label="Friend code" value="BIRD-1234" copied onCopy={onCopy.handle} />);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});
