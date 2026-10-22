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
  ],
  invalid: [
    { code: "if (toPar < 0) x();", errors: [{ messageId: "branch" }] },
    { code: "const c = hovered.to_par > 0 ? a : b;", errors: [{ messageId: "branch" }] },
    { code: "if (diff <= -1) return 22;", errors: [{ messageId: "branch" }] },
    { code: 'if (0 === holeToPar) return "E";', errors: [{ messageId: "branch" }] },
  ],
});

tester.run("golf/no-golf-math", golf.rules["no-golf-math"], {
  valid: ["const left = total - used;", "const gap = score - goal;"],
  invalid: [
    { code: "const diff = strokes - par;", errors: [{ messageId: "math" }] },
    { code: "const d = hole.strokes - hole.par_played;", errors: [{ messageId: "math" }] },
    { code: "const toPar = total_score - course_par;", errors: [{ messageId: "math" }] },
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

