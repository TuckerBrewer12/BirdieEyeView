import { describe, expect, it } from "vitest";
import {
  SCORE_KINDS,
  formatAverageToPar,
  formatAverageToParTenths,
  playedScoreKinds,
  scoreKind,
  scoreKindCountLabel,
  scoreKindLabel,
  scoreMixFrom,
  strokesToPar,
  toParLabel,
} from "../score";

describe("scoreMixFrom", () => {
  it("reads a server row's double, triple and quad bogey shares as the mix's kinds", () => {
    expect(
      scoreMixFrom({ eagle: 1, birdie: 2, par: 3, bogey: 4, double_bogey: 5, triple_bogey: 6, quad_bogey: 7 }),
    ).toEqual({ eagle: 1, birdie: 2, par: 3, bogey: 4, double: 5, triple: 6, quad: 7 });
  });
});

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

describe("formatAverageToPar", () => {
  it("writes an average to par to two places", () => {
    expect(formatAverageToPar(0.8)).toBe("+0.8");
    expect(formatAverageToPar(0.846)).toBe("+0.85");
    expect(formatAverageToPar(-0.1)).toBe("-0.1");
  });

  it("is E for even, and for anything that rounds to it", () => {
    expect(formatAverageToPar(0)).toBe("E");
    expect(formatAverageToPar(0.004)).toBe("E");
    expect(formatAverageToPar(-0.004)).toBe("E");
  });

  it("rounds a half the same way under par as over", () => {
    expect(formatAverageToPar(0.125)).toBe("+0.13");
    expect(formatAverageToPar(-0.125)).toBe("-0.13");
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

describe("formatAverageToParTenths", () => {
  it("writes an average to par to a tenth, with a true minus under par", () => {
    expect(formatAverageToParTenths(0.5)).toBe("+0.5");
    expect(formatAverageToParTenths(3)).toBe("+3.0");
    expect(formatAverageToParTenths(-0.46)).toBe("\u22120.5");
  });

  it("is E for anything that rounds to even, and a dash for nothing", () => {
    expect(formatAverageToParTenths(0.04)).toBe("E");
    expect(formatAverageToParTenths(-0.04)).toBe("E");
    expect(formatAverageToParTenths(null)).toBe("—");
  });

  it("rounds a half away from even on both sides", () => {
    expect(formatAverageToParTenths(0.25)).toBe("+0.3");
    expect(formatAverageToParTenths(-0.25)).toBe("\u22120.3");
  });
});
