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
