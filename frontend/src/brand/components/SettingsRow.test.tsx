import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { SettingsGroup, SettingsRow } from "./SettingsRow";

describe("SettingsRow", () => {
  it("toggles a switch from its label", () => {
    const onCheckedChange = new FakeHandler<[boolean]>();
    render(<SettingsRow type="switch" label="Email updates" onCheckedChange={onCheckedChange.handle} />);
    fireEvent.click(screen.getByText("Email updates"));
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
        defaultValue="light"
        onValueChange={onValueChange.handle}
      />,
    );
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(onValueChange.calls).toEqual([["dark"]]);
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
  });

  it("links a navigate row with an href and acts on a destructive one", () => {
    const onClick = new FakeHandler();
    render(
      <SettingsGroup>
        <SettingsRow type="navigate" label="Home course" value="Pebble Beach" href="/course" />
        <SettingsRow type="destructive" label="Sign out" onClick={onClick.handle} />
      </SettingsGroup>,
    );
    expect(screen.getByRole("link", { name: /Home course/ })).toHaveAttribute("href", "/course");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onClick.calls).toHaveLength(1);
  });

  it("calls the copy action", () => {
    const onAction = new FakeHandler();
    render(
      <SettingsRow
        type="copy"
        label="Friend code"
        value="BIRD-1234"
        actionLabel="Copy friend code"
        onAction={onAction.handle}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy friend code" }));
    expect(onAction.calls).toHaveLength(1);
  });
});
