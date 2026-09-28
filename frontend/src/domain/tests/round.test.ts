import { describe, expect, it } from "vitest";
import type { Course, Round as RoundDto } from "@/types/golf";
import { populatedRounds } from "@/testing/fixtures/rounds";
import { HoleScore, Round } from "../round";

const linked: Course = {
  id: "c1",
  name: "Linked",
  location: null,
  par: 72,
  holes: [
    { number: 1, par: 4, handicap: 1 },
    { number: 2, par: 3, handicap: 2 },
  ],
  tees: [],
};

function dto(overrides: Partial<RoundDto> = {}): RoundDto {
  return {
    id: "r1",
    course: null,
    tee_box: null,
    date: null,
    hole_scores: [
      {
        hole_number: 1,
        strokes: 5,
        net_score: null,
        putts: 2,
        shots_to_green: null,
        fairway_hit: true,
        green_in_regulation: false,
        par_played: 4,
        handicap_played: 1,
      },
      {
        hole_number: 2,
        strokes: 3,
        net_score: null,
        putts: 1,
        shots_to_green: null,
        fairway_hit: null,
        green_in_regulation: true,
        par_played: 3,
        handicap_played: 2,
      },
    ],
    weather_conditions: null,
    notes: null,
    total_putts: null,
    total_gir: null,
    course_name_played: null,
    user_tee: null,
    ...overrides,
  };
}

function hole(number: number, strokes: number | null, par = 4): HoleScore {
  return new HoleScore({ hole: number, par, strokes });
}

function roundOf(holes: HoleScore[]): Round {
  return new Round({ id: "r", date: null, course: null, teeBox: null, holes });
}

const eighteen = Array.from({ length: 18 }, (_, i) => hole(i + 1, 5));

describe("Round.fromDto", () => {
  it("sums par_played when the round has no course", () => {
    const round = Round.fromDto(dto());
    expect(round.par).toBe(7);
    expect(round.score).toBe(8);
    expect(round.toPar).toBe(1);
  });

  it("uses the linked course par when present", () => {
    expect(Round.fromDto(dto({ course: linked })).par).toBe(72);
  });

  it("prefers course hole par over par_played", () => {
    const round = Round.fromDto(dto({ course: linked, hole_scores: dto().hole_scores.map((s) => ({ ...s, par_played: 5 })) }));
    expect(round.holes.map((h) => h.par)).toEqual([4, 3]);
  });

  it("reads the round against another course when given one", () => {
    expect(Round.fromDto(dto(), linked).par).toBe(72);
  });

  it("does not invent par 4 when par is unknown", () => {
    const round = Round.fromDto(dto({ hole_scores: [{ ...dto().hole_scores[0], par_played: null }] }));
    expect(round.holes[0].par).toBeNull();
    expect(round.holes[0].kind).toBeNull();
  });

  it("classifies each hole from its strokes and par", () => {
    expect(Round.fromDto(dto()).holes.map((h) => h.kind)).toEqual(["bogey", "par"]);
    expect(Round.fromDto(dto()).kindCounts).toEqual({ bogey: 1, par: 1 });
  });

  it("sums putts from the holes when no total is stored", () => {
    expect(Round.fromDto(dto()).putts).toBe(3);
    expect(Round.fromDto(dto({ total_putts: 30 })).putts).toBe(30);
  });

  it("nets the score against a course handicap", () => {
    expect(Round.fromDto(dto()).netScore(3)).toBe(5);
  });
});

describe("Round.fromSummary", () => {
  it("keeps unscored holes in their slot, in hole order", () => {
    const round = Round.fromSummary({
      ...populatedRounds[0],
      hole_scores_summary: [
        { h: 2, s: null, p: 4 },
        { h: 1, s: 3, p: 4 },
      ],
    });
    expect(round.holes.map((h) => [h.hole, h.strokes])).toEqual([[1, 3], [2, null]]);
    expect(round.score).toBe(3);
  });

  it("derives the same figures the server stores", () => {
    for (const summary of populatedRounds) {
      const round = Round.fromSummary(summary);
      expect(round.score).toBe(summary.total_score);
      expect(round.toPar).toBe(summary.to_par);
      expect(round.frontNine.total).toBe(summary.front_nine);
      expect(round.backNine.total).toBe(summary.back_nine);
    }
  });
});

describe("nines", () => {
  it("splits by hole number, so a back-nine-only round lands on the back", () => {
    const round = roundOf(eighteen.slice(9));
    expect(round.frontNine.holes).toHaveLength(0);
    expect(round.backNine.total).toBe(45);
  });

  it("leaves a nine's total off until all nine are scored", () => {
    const round = roundOf(eighteen.map((h) => (h.hole === 12 ? hole(12, null) : h)));
    expect(round.frontNine.total).toBe(45);
    expect(round.backNine.total).toBeNull();
  });
});

describe("withStrokes", () => {
  it("returns a new round that reads the edits", () => {
    const original = Round.fromDto(dto());
    const edited = original.withStrokes({ 1: { strokes: 4 } });
    expect(edited.score).toBe(7);
    expect(edited.toPar).toBe(0);
    expect(original.score).toBe(8);
  });
});
