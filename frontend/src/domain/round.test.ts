import { describe, expect, it } from "vitest";
import type { Course, Round } from "@/types/golf";
import { playedHoles, roundPar, roundToPar, totalStrokes } from "./round";

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

function round(overrides: Partial<Round> = {}): Round {
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

describe("roundPar / totalStrokes / roundToPar", () => {
  it("sums par_played when the round has no course", () => {
    expect(roundPar(round())).toBe(7);
    expect(totalStrokes(round())).toBe(8);
    expect(roundToPar(round())).toBe(1);
  });

  it("uses the linked course par when present", () => {
    expect(roundPar(round({ course: linked }))).toBe(72);
  });

  it("applies edited strokes to the total", () => {
    expect(totalStrokes(round(), { 1: { strokes: 4 } })).toBe(7);
  });
});

describe("playedHoles", () => {
  it("does not invent par 4 when par is unknown", () => {
    const holes = playedHoles(
      round({
        hole_scores: [
          {
            hole_number: 1,
            strokes: 5,
            net_score: null,
            putts: null,
            shots_to_green: null,
            fairway_hit: null,
            green_in_regulation: null,
            par_played: null,
            handicap_played: null,
          },
        ],
      }),
    );
    expect(holes).toEqual([
      {
        hole: 1,
        strokes: 5,
        par: null,
        toPar: null,
        putts: null,
        gir: null,
        fairway: null,
      },
    ]);
  });

  it("prefers course hole par over par_played", () => {
    const holes = playedHoles(round({ course: linked }));
    expect(holes[0].par).toBe(4);
    expect(holes[1].par).toBe(3);
  });
});
