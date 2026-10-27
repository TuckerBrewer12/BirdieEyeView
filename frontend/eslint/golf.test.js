import golf from "./golf.js";
import { tester } from "./tester.js";

tester.run("golf/no-score-kind-table", golf.rules["no-score-kind-table"], {
  valid: [
    "const sizes = { sm: 1, md: 2, lg: 3, xl: 4 };",
    // Three keys is a coincidence, not a score table.
    "const tiles = { birdie: a, par: b, bogey: c };",
    // Numbers per score type are data, like a round's counts or a score mix.
    "const mix = { eagle: 0, birdie: 10, par: 40, bogey: 35, double: 10, triple: 5, quad: 0 };",
  ],
  invalid: [
    {
      code: 'const LABEL = { eagle: "Eagle+", birdie: "Birdie", par: "Par", bogey: "Bogey", double: "Double" };',
      errors: [{ messageId: "table" }],
    },
    {
      // The legacy analytics spelling.
      code: 'const c = { eagle: "a", birdie: "b", bogey: "c", double_bogey: "d", triple_bogey: "e" };',
      errors: [{ messageId: "table" }],
    },
    {
      // A map from score type to an API field is a table too.
      code: 'const ROW_KEY = { eagle: "eagle", birdie: "birdie", par: "par", bogey: "bogey", double: "double_bogey" };',
      errors: [{ messageId: "table" }],
    },
  ],
});

tester.run("golf/no-to-par-branch", golf.rules["no-to-par-branch"], {
  valid: [
    "if (courseHandicap < 0) x();",
    "const wide = holes.length > 9;",
    "if (toPar == null) return null;",
    // A fallback whose first choice is not a to-par is not a to-par either.
    "if ((count ?? toPar) > 0) x();",
    // Indexing a list by a to-par reads the list, not the to-par.
    "const tone = TONES[toPar] > 0;",
  ],
  invalid: [
    { code: "if (toPar < 0) x();", errors: [{ messageId: "branch" }] },
    { code: "const c = hovered.to_par > 0 ? a : b;", errors: [{ messageId: "branch" }] },
    { code: "if (diff <= -1) return 22;", errors: [{ messageId: "branch" }] },
    { code: 'if (0 === holeToPar) return "E";', errors: [{ messageId: "branch" }] },
    // A missing to-par defaulted to even is still a to-par being sorted.
    { code: "const over = (lastRound.toPar ?? 0) > 0;", errors: [{ messageId: "branch" }] },
    { code: "const under = (round.to_par || 0) < 0;", errors: [{ messageId: "branch" }] },
    // One to-par out of a list is still a to-par.
    { code: "if (SAMPLE.toPar[i] < 0) x();", errors: [{ messageId: "branch" }] },
    { code: "if ((hole.toPar as number) > 0) x();", errors: [{ messageId: "branch" }] },
  ],
});

tester.run("golf/no-golf-math", golf.rules["no-golf-math"], {
  valid: [
    "const left = total - used;",
    "const gap = score - goal;",
    "const wide = holes.length > 9;",
    "const met = score <= goal;",
    // Comparing two pars, or two scores, says nothing about how a hole was played.
    "const same = hole.par === round.par;",
    "const better = score < best.score;",
  ],
  invalid: [
    { code: "const diff = strokes - par;", errors: [{ messageId: "math" }] },
    { code: "const d = hole.strokes - hole.par_played;", errors: [{ messageId: "math" }] },
    { code: "const toPar = total_score - course_par;", errors: [{ messageId: "math" }] },
    // One hole's strokes out of a list.
    { code: "const label = toParLabel(SAMPLE.strokes[i] - par);", errors: [{ messageId: "math" }] },
    { code: "const d = (hole.strokes ?? 0) - hole.par;", errors: [{ messageId: "math" }] },
    // Comparing strokes to par is classifying the score by hand.
    { code: "const over = SAMPLE.strokes[i] > par;", errors: [{ messageId: "compare" }] },
    { code: "if (hole.strokes <= hole.par_played) x();", errors: [{ messageId: "compare" }] },
    { code: "const isPar = par === score;", errors: [{ messageId: "compare" }] },
  ],
});

tester.run("golf/no-par-fallback", golf.rules["no-par-fallback"], {
  valid: [
    "const total = a.total ?? b.total;",
    "const par = hole.par ?? 4;",
    "const par = round.par_played;",
    // A par alongside something that is not a par is not a fallback between two pars.
    "const shown = round.par ?? round.score;",
  ],
  invalid: [
    // The par played and the course's par are different figures.
    { code: "const par = round.par ?? round.course?.par;", errors: [{ messageId: "fallback" }] },
    { code: "const effectivePar = hole?.par ?? score?.par_played;", errors: [{ messageId: "fallback" }] },
    { code: "const par = parPlayed || coursePar;", errors: [{ messageId: "fallback" }] },
    // A chain of fallbacks is reported once.
    { code: "const par = a.par ?? b.par_played ?? 72;", errors: [{ messageId: "fallback" }] },
  ],
});

tester.run("golf/no-shadowed-golf-type", golf.rules["no-shadowed-golf-type"], {
  valid: [
    "interface ScorecardRow { label: string }",
    // Narrowing the domain type is the way to need a stricter one.
    "type HoleScore = Base & { strokes: number };",
    'import type { HoleScore } from "@/domain";',
  ],
  invalid: [
    { code: "interface HoleScore { hole: number; strokes: number; par: number }", errors: [{ messageId: "shape" }] },
    { code: "type Round = { id: string; score: number };", errors: [{ messageId: "shape" }] },
  ],
});

