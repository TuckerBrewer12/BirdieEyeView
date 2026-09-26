import { describe, expect, it } from "vitest";
import type { Course, Round as RoundDto } from "@/types/golf";
import { populatedRounds } from "@/testing/fixtures/rounds";
import {
  backNine,
  frontNine,
  holeKind,
  nineTotal,
  roundFromDto,
  roundFromSummary,
  roundPar,
  roundPutts,
  roundScore,
  roundToPar,
  withStrokes,
  type HoleScore,
} from "../round";

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
  return { hole: number, par, strokes, putts: null, gir: null, fairway: null };
}

const eighteen = Array.from({ length: 18 }, (_, i) => hole(i + 1, 5));

describe("roundFromDto", () => {
  it("sums par_played when the round has no course", () => {
    const round = roundFromDto(dto());
    expect(roundPar(round)).toBe(7);
    expect(roundScore(round)).toBe(8);
    expect(roundToPar(round)).toBe(1);
  });

  it("uses the linked course par when present", () => {
    expect(roundPar(roundFromDto(dto({ course: linked })))).toBe(72);
  });

  it("prefers course hole par over par_played", () => {
    const round = roundFromDto(dto({ course: linked, hole_scores: dto().hole_scores.map((s) => ({ ...s, par_played: 5 })) }));
    expect(round.holes.map((h) => h.par)).toEqual([4, 3]);
  });

  it("reads the round against another course when given one", () => {
    expect(roundPar(roundFromDto(dto(), linked))).toBe(72);
  });

  it("does not invent par 4 when par is unknown", () => {
    const round = roundFromDto(
      dto({ hole_scores: [{ ...dto().hole_scores[0], par_played: null }] }),
    );
    expect(round.holes[0].par).toBeNull();
    expect(holeKind(round.holes[0])).toBeNull();
  });

  it("classifies each hole from its strokes and par", () => {
    expect(roundFromDto(dto()).holes.map(holeKind)).toEqual(["bogey", "par"]);
  });

  it("sums putts from the holes when no total is stored", () => {
    expect(roundPutts(roundFromDto(dto()))).toBe(3);
    expect(roundPutts(roundFromDto(dto({ total_putts: 30 })))).toBe(30);
  });
});

describe("roundFromSummary", () => {
  it("keeps unscored holes in their slot", () => {
    const round = roundFromSummary({
      ...populatedRounds[0],
      hole_scores_summary: [
        { h: 2, s: null, p: 4 },
        { h: 1, s: 3, p: 4 },
      ],
    });
    expect(round.holes.map((h) => [h.hole, h.strokes])).toEqual([[1, 3], [2, null]]);
    expect(roundScore(round)).toBe(3);
  });

  it("derives the same figures the server stores", () => {
    for (const summary of populatedRounds) {
      const round = roundFromSummary(summary);
      expect(roundScore(round)).toBe(summary.total_score);
      expect(roundToPar(round)).toBe(summary.to_par);
      expect(nineTotal(frontNine(round.holes))).toBe(summary.front_nine);
      expect(nineTotal(backNine(round.holes))).toBe(summary.back_nine);
    }
  });
});

describe("nines", () => {
  it("splits by hole number, so a back-nine-only round lands on the back", () => {
    const back = eighteen.slice(9);
    expect(frontNine(back)).toHaveLength(0);
    expect(nineTotal(backNine(back))).toBe(45);
  });

  it("leaves a nine's total off until all nine are scored", () => {
    const holes = eighteen.map((h) => (h.hole === 12 ? hole(12, null) : h));
    expect(nineTotal(frontNine(holes))).toBe(45);
    expect(nineTotal(backNine(holes))).toBeNull();
  });
});

describe("withStrokes", () => {
  it("applies edits before anything is derived", () => {
    const round = withStrokes(roundFromDto(dto()), { 1: { strokes: 4 } });
    expect(roundScore(round)).toBe(7);
    expect(roundToPar(round)).toBe(0);
  });
});
