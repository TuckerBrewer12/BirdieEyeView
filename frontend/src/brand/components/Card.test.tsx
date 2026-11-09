import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("lifts on hover only when it's interactive", () => {
    render(
      <>
        <Card render={<section aria-label="Recent rounds" />}>Rounds</Card>
        <Card render={<a href="#round" aria-label="Open the round" />} interactive>
          Round
        </Card>
      </>,
    );
    expect(screen.getByRole("region", { name: "Recent rounds" }).className).not.toContain("hover:shadow-card");
    expect(screen.getByRole("link", { name: "Open the round" }).className).toContain("hover:shadow-card");
  });

  it("keeps the data-slot a page gives it", () => {
    render(<Card data-slot="records-card">Records</Card>);
    expect(screen.getByText("Records").getAttribute("data-slot")).toBe("records-card");
  });
});
