import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SettingsGroup, SettingsRow } from "./SettingsRow";

describe("SettingsRow", () => {
  it("toggles a switch from its label", () => {
    const onCheckedChange = vi.fn();
    render(<SettingsRow type="switch" label="Email updates" onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByText("Email updates"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("marks the chosen option and changes it", () => {
    const onValueChange = vi.fn();
    render(
      <SettingsRow
        type="choose"
        label="Theme"
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        defaultValue="light"
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(onValueChange).toHaveBeenCalledWith("dark");
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
  });

  it("links a navigate row with an href and acts on a destructive one", () => {
    const onClick = vi.fn();
    render(
      <SettingsGroup>
        <SettingsRow type="navigate" label="Home course" value="Pebble Beach" href="/course" />
        <SettingsRow type="destructive" label="Sign out" onClick={onClick} />
      </SettingsGroup>,
    );
    expect(screen.getByRole("link", { name: /Home course/ })).toHaveAttribute("href", "/course");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("calls the copy action", () => {
    const onAction = vi.fn();
    render(
      <SettingsRow
        type="copy"
        label="Friend code"
        value="BIRD-1234"
        actionLabel="Copy friend code"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy friend code" }));
    expect(onAction).toHaveBeenCalled();
  });
});
