import { describe, expect, it } from "vitest";
import {
  SCORE_KINDS,
  playedScoreKinds,
  scoreKind,
  scoreKindCountLabel,
  scoreKindLabel,
  strokesToPar,
  toParLabel,
} from "../score";

describe("scoreKind", () => {
  it("returns null when strokes or par is missing", () => {
    expect(scoreKind(null, 4)).toBeNull();
    expect(scoreKind(4, null)).toBeNull();
    expect(scoreKind(undefined, 4)).toBeNull();
  });

  it("exposes the seven buckets in display order", () => {
    expect(SCORE_KINDS).toEqual([
      "eagle", "birdie", "par", "bogey", "double", "triple", "quad",
    ]);
  });

  it("buckets relative to par, with eagle+ and quad+ at the ends", () => {
    expect(scoreKind(1, 4)).toBe("eagle");
    expect(scoreKind(2, 4)).toBe("eagle");
    expect(scoreKind(3, 4)).toBe("birdie");
    expect(scoreKind(4, 4)).toBe("par");
    expect(scoreKind(5, 4)).toBe("bogey");
    expect(scoreKind(6, 4)).toBe("double");
    expect(scoreKind(7, 4)).toBe("triple");
    expect(scoreKind(8, 4)).toBe("quad");
    expect(scoreKind(12, 4)).toBe("quad");
  });
});

describe("strokesToPar", () => {
  it("returns null when either value is missing", () => {
    expect(strokesToPar(4, null)).toBeNull();
    expect(strokesToPar(null, 4)).toBeNull();
  });

  it("is strokes minus par", () => {
    expect(strokesToPar(3, 4)).toBe(-1);
    expect(strokesToPar(4, 4)).toBe(0);
    expect(strokesToPar(6, 4)).toBe(2);
  });
});

describe("scoreKindLabel", () => {
  it("names each score kind, open-ended at both ends", () => {
    expect(SCORE_KINDS.map((kind) => scoreKindLabel(kind))).toEqual([
      "Eagle+", "Birdie", "Par", "Bogey", "Double", "Triple", "Quad+",
    ]);
  });
});

describe("toParLabel", () => {
  it("writes even as E and over par with a plus", () => {
    expect([toParLabel(-2), toParLabel(0), toParLabel(3), toParLabel(null)]).toEqual(["-2", "E", "+3", null]);
  });
});

describe("playedScoreKinds", () => {
  it("lists the kinds a round had, in display order, with their counts", () => {
    expect(playedScoreKinds({ quad: 1, birdie: 2, par: 9, bogey: 0, eagle: null })).toEqual([
      { kind: "birdie", count: 2 },
      { kind: "par", count: 9 },
      { kind: "quad", count: 1 },
    ]);
  });
});

describe("scoreKindCountLabel", () => {
  it("is singular for one hole and plural otherwise", () => {
    expect([scoreKindCountLabel("birdie", 1), scoreKindCountLabel("birdie", 3), scoreKindCountLabel("quad", 2)])
      .toEqual(["Birdie", "Birdies", "Quads+"]);
  });
});
