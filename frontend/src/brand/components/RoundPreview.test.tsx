import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Round, type RoundSummary } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";
import { RoundPreview } from "./RoundPreview";

const [halfMoonBay, , , scanned] = populatedRounds.map(Round.fromSummary);

const blank: RoundSummary = {
  ...scanned,
  date: null,
  course: { id: null, name: null },
  teeBox: null,
  holes: [],
  frontNine: { holes: [], total: null },
  backNine: { holes: [], total: null },
  score: null,
  toPar: null,
  putts: null,
};

function clicks() {
  const counter = { count: 0, onClick: () => void counter.count++ };
  return counter;
}

function preview(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>('[data-slot="round-preview"]');
  if (!root) throw new Error("no round preview rendered");
  return root;
}

describe("RoundPreview list row (no variant)", () => {
  it("shows the day, course, nines, putts and tee, then the score and its to par", () => {
    const { container } = render(<RoundPreview round={halfMoonBay} onClick={() => {}} />);
    const row = preview(container);
    expect(row).not.toHaveAttribute("data-variant");
    expect(row).toHaveTextContent("JUN15");
    expect(screen.getByRole("button", { name: "Half Moon Bay" })).toBeEnabled();
    expect(screen.getByText("40 · 38 · 32 putts · Blue")).toBeInTheDocument();
    expect(row).toHaveTextContent(/78\+6$/);
    expect(row.querySelector('[data-slot="hole-score-bars"]')).not.toBeNull();
  });

  it("opens the round from the course name", () => {
    const opened = clicks();
    render(<RoundPreview round={halfMoonBay} onClick={opened.onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Half Moon Bay" }));
    expect(opened.count).toBe(1);
  });

  it("disables the course name when there's nothing to open", () => {
    render(<RoundPreview round={halfMoonBay} />);
    expect(screen.getByRole("button", { name: "Half Moon Bay" })).toBeDisabled();
  });

  it("offers to link a round with no saved course", () => {
    const linked = clicks();
    render(<RoundPreview round={scanned} onClick={() => {}} onLinkClick={linked.onClick} />);
    expect(screen.getByText(/43 · 42 · 36 putts/)).toHaveTextContent("43 · 42 · 36 putts · Not linked · Link");
    fireEvent.click(screen.getByRole("button", { name: "Link Scanned Scorecard to a saved course" }));
    expect(linked.count).toBe(1);
  });

  it("leaves the link out without a handler", () => {
    render(<RoundPreview round={scanned} onClick={() => {}} />);
    expect(screen.getByText("43 · 42 · 36 putts")).toBeInTheDocument();
    expect(screen.queryByText(/Not linked/)).toBeNull();
  });

  it("drops the nines when either is missing, and the meta line when nothing's known", () => {
    const frontOnly: RoundSummary = {
      ...halfMoonBay,
      putts: null,
      teeBox: null,
      backNine: { ...halfMoonBay.backNine, total: null },
    };
    const { container } = render(<RoundPreview round={frontOnly} />);
    expect(preview(container)).toHaveTextContent(/^JUN15Half Moon Bay78\+6$/);
  });

  it("shows dashes for a round with no day, course or score", () => {
    const { container } = render(<RoundPreview round={blank} onLinkClick={() => {}} />);
    const row = preview(container);
    expect(row).toHaveTextContent(/^—Unknown courseNot linked · Link—/);
    expect(row.querySelector('[data-slot="hole-score-bars"]')).toBeNull();
  });
});

describe("RoundPreview history", () => {
  it("is one button with the full day, the strip, the score and its to par", () => {
    const opened = clicks();
    const { container } = render(<RoundPreview variant="history" round={halfMoonBay} onClick={opened.onClick} />);
    const row = preview(container);
    expect(row).toHaveAttribute("data-variant", "history");
    expect(row.tagName).toBe("BUTTON");
    expect(row).toHaveTextContent(/^Jun 15, 202678\+6$/);
    expect(row.querySelector('[data-slot="hole-score-bars"]')).not.toBeNull();
    fireEvent.click(row);
    expect(opened.count).toBe(1);
  });

  it("is disabled with nothing to open, and dashes what it doesn't know", () => {
    const { container } = render(<RoundPreview variant="history" round={blank} />);
    const row = preview(container);
    expect(row).toBeDisabled();
    expect(row).toHaveTextContent(/^——/);
    expect(row.querySelector('[data-slot="hole-score-bars"]')).toBeNull();
  });
});

describe("RoundPreview highlight", () => {
  it("names the best recent round with its day, to par, hole shapes and score", () => {
    const opened = clicks();
    const { container } = render(<RoundPreview variant="highlight" round={halfMoonBay} onClick={opened.onClick} />);
    const card = preview(container);
    expect(card.tagName).toBe("BUTTON");
    expect(card).toHaveTextContent(/^Best Recent RoundHalf Moon BayJun 15 · \+6/);
    expect(card).toHaveTextContent(/78$/);
    expect(card.querySelector('[data-slot="hole-score-shapes"]')).not.toBeNull();
    fireEvent.click(card);
    expect(opened.count).toBe(1);
  });

  it("leaves the to par out when it isn't known", () => {
    const { container } = render(<RoundPreview variant="highlight" round={blank} />);
    const card = preview(container);
    expect(card).toBeDisabled();
    expect(card).toHaveTextContent(/^Best Recent RoundUnknown course—/);
    expect(card).not.toHaveTextContent("·");
  });

  it("asks for a round when there isn't one", () => {
    const { container } = render(<RoundPreview variant="highlight" round={null} />);
    expect(preview(container)).toHaveAttribute("data-slot", "round-preview");
    expect(screen.getByText("Play a round to unlock highlights!")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("RoundPreview compact", () => {
  it("puts the day before the course inline, with the strip", () => {
    const { container } = render(<RoundPreview variant="compact" round={halfMoonBay} onClick={() => {}} />);
    const row = preview(container);
    expect(row).toHaveAttribute("data-variant", "compact");
    expect(row).toHaveTextContent(/^Jun 15Half Moon Bay78\+6$/);
    expect(row.querySelector('[data-slot="hole-score-bars"]')).not.toBeNull();
    expect(row).toBeEnabled();
  });

  it("stacks the course over the day without the strip", () => {
    const { container } = render(<RoundPreview variant="compact" layout="stacked" round={halfMoonBay} />);
    const row = preview(container);
    expect(row).toHaveTextContent(/^Half Moon BayJun 1578\+6$/);
    expect(row.querySelector('[data-slot="hole-score-bars"]')).toBeNull();
    expect(row).toBeDisabled();
  });
});

describe("RoundPreview summary", () => {
  it("shows the course, day and tee, score, and two nines in an outline", () => {
    const { container } = render(<RoundPreview variant="summary" round={halfMoonBay} />);
    const box = preview(container);
    expect(box).toHaveAttribute("data-variant", "summary");
    expect(box).toHaveClass("border");
    expect(box).toHaveTextContent(/^Half Moon BayJun 15 · Blue tees78\+6$/);
    expect(box.querySelectorAll('[data-slot="hole-score-bars"]')).toHaveLength(2);
  });

  it("draws one strip with no frame when asked", () => {
    const { container } = render(<RoundPreview variant="summary" holes="strip" frame="none" round={halfMoonBay} />);
    const box = preview(container);
    expect(box).not.toHaveClass("border");
    expect(box.querySelectorAll('[data-slot="hole-score-bars"]')).toHaveLength(1);
  });

  it("leaves the day line out when neither day nor tee is known", () => {
    const { container } = render(<RoundPreview variant="summary" round={blank} />);
    expect(preview(container)).toHaveTextContent(/^Unknown course—/);
    expect(preview(container).querySelectorAll("p")).toHaveLength(1);
  });
});
