import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { afterAll, describe, it } from "vitest";
import golf from "./golf.js";
import kit from "./kit.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run("golf/no-score-kind-table", golf.rules["no-score-kind-table"], {
  valid: [
    "const sizes = { sm: 1, md: 2, lg: 3, xl: 4 };",
    // Three keys is a coincidence, not a score table.
    "const tiles = { birdie: a, par: b, bogey: c };",
  ],
  invalid: [
    {
      code: 'const LABEL = { eagle: "Eagle+", birdie: "Birdie", par: "Par", bogey: "Bogey", double: "Double" };',
      errors: [{ messageId: "table" }],
    },
    {
      // The legacy analytics spelling.
      code: "const c = { eagle: 1, birdie: 2, bogey: 3, double_bogey: 4, triple_bogey: 5 };",
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

tester.run("kit/no-arbitrary-value", kit.rules["no-arbitrary-value"], {
  valid: [
    'const c = "text-body w-preview";',
    // Variants and token-less layout values are not hardcoded measures.
    'const c = "data-[slot=card]:p-2 has-[>svg]:gap-2 grid-cols-[1fr_auto] group-data-[size=sm]/card:text-sm";',
    'const c = "gap-(--card-spacing)";',
    // A bracketed colour is no-color-literal's to report, percentages in a mix included.
    'const c = "bg-[#eef7f0]";',
    'const c = "bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]";',
    'import x from "./a-[1px].css";',
  ],
  invalid: [
    { code: 'const c = "h-auto p-0 text-[13px]";', errors: [{ messageId: "arbitrary" }] },
    { code: 'const el = <div className="min-w-[720px] -left-[9999px]" />;', errors: 2 },
    { code: "const c = `px-3 ${on ? \"w-[54%]\" : \"\"}`;", errors: [{ messageId: "arbitrary" }] },
  ],
});

tester.run("kit/no-color-literal", kit.rules["no-color-literal"], {
  valid: ['const c = "bg-card text-muted-foreground text-score-birdie";', 'const c = "#hole-3";'],
  invalid: [
    { code: 'const c = "text-gray-400";', errors: [{ messageId: "color" }] },
    { code: 'const fill = "#ef4444";', errors: [{ messageId: "color" }] },
    { code: 'const c = "bg-[#eef7f0]";', errors: [{ messageId: "color" }] },
    { code: 'const s = { color: "rgba(0,0,0,0.5)" };', errors: [{ messageId: "color" }] },
    {
      code: 'const c = "hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]";',
      errors: [{ messageId: "color" }],
    },
  ],
});
