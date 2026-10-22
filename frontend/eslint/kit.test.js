import kit from "./kit.js";
import { tester } from "./tester.js";

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
  valid: [
    'const c = "bg-card text-muted-foreground text-score-birdie";',
    'const c = "#hole-3";',
    // White and black only count as utilities, not as words.
    'const label = "Play from the white tee or the black tee";',
    'const c = "bg-card text-primary-foreground border-border";',
  ],
  invalid: [
    { code: 'const c = "text-gray-400";', errors: [{ messageId: "color" }] },
    { code: 'const c = "border-t-gray-200";', errors: [{ messageId: "color" }] },
    { code: 'const fill = "#ef4444";', errors: [{ messageId: "color" }] },
    { code: 'const c = "bg-[#eef7f0]";', errors: [{ messageId: "color" }] },
    { code: 'const s = { color: "rgba(0,0,0,0.5)" };', errors: [{ messageId: "color" }] },
    {
      code: 'const c = "hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]";',
      errors: [{ messageId: "color" }],
    },
    {
      code: 'const el = <span className="bg-white text-black" />;',
      errors: [{ messageId: "whiteBlack" }, { messageId: "whiteBlack" }],
    },
    // The opacity is no-opacity-wash's to report; the white is still white.
    {
      code: 'const c = "text-white/90 dark:border-white";',
      errors: [{ messageId: "whiteBlack" }, { messageId: "whiteBlack" }],
    },
  ],
});

tester.run("kit/no-opacity-wash", kit.rules["no-opacity-wash"], {
  valid: [
    'const c = "bg-score-birdie-muted bg-muted text-muted-foreground";',
    // A named opacity token and a font size's line height are not hand-picked washes.
    'const c = "bg-primary/wash text-sm/6 text-body/7";',
    // Fractions and slashes outside a colour utility are other rules' business.
    'const c = "w-1/2 grid-cols-[1fr_auto] group-hover/card:text-primary";',
    'const href = "https://example.com/to-do/10";',
    'const c = "from-primary via-accent to-transparent";',
  ],
  invalid: [
    { code: 'const c = "bg-score-birdie/10";', errors: [{ messageId: "opacity" }] },
    { code: 'const c = "bg-gradient-to-b from-primary/8 to-background";', errors: [{ messageId: "opacity" }] },
    { code: 'const el = <p className="text-white/70 border-border/50 ring-primary/30" />;', errors: 3 },
    { code: 'const c = "border-border/[0.5]";', errors: [{ messageId: "opacity" }] },
    // A variant does not hide the class it guards.
    { code: 'const c = "hover:bg-primary/90 dark:bg-card/60";', errors: 2 },
    {
      code: 'const c = "from-primary from-10% to-accent to-55%";',
      errors: [{ messageId: "stop" }, { messageId: "stop" }],
    },
  ],
});

tester.run("kit/no-fraction-size", kit.rules["no-fraction-size"], {
  valid: [
    // Halves, thirds, quarters, sixths and twelfths are the layout grid.
    'const c = "w-1/2 w-2/3 basis-3/4 w-5/6 w-7/12 w-full -translate-y-1/2 top-1/2";',
    'const c = "aspect-4/3 bg-primary/30 grid-cols-[1fr_auto]";',
    'const c = "h-profile-par w-preview";',
  ],
  invalid: [
    // PR #315's profile bars, before they got --brand-size-profile-* tokens.
    { code: 'const c = "h-7/25";', errors: [{ messageId: "fraction" }] },
    { code: 'const el = <div className="w-3/7 basis-5/9 min-h-2/5" />;', errors: 3 },
    { code: "const c = `flex ${tall ? \"md:h-9/10\" : \"size-4/5\"}`;", errors: 2 },
  ],
});
