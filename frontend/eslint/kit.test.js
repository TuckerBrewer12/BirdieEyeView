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

tester.run("kit/no-arbitrary-value (numbers)", kit.rules["no-arbitrary-value"], {
  valid: ['const c = "flex-1 grow basis-0 z-10";'],
  invalid: [
    { code: 'const c = "flex-[1.3]";', errors: [{ messageId: "number" }] },
    { code: 'const c = "z-[60]";', errors: [{ messageId: "number" }] },
  ],
});

tester.run("kit/no-off-scale-spacing", kit.rules["no-off-scale-spacing"], {
  valid: [
    'const c = "px-5 py-4 gap-4 w-10 size-3";',
    // Tailwind's half steps under 4 are the 2px a hairline gap or an icon nudge needs.
    'const c = "gap-0.5 py-1.5 px-2.5 size-3.5 -mt-0.5";',
    // Named measures and fractions are other rules' business.
    'const c = "w-sparkline-card px-page-phone w-1/2";',
    'const v = "1.5 rounds";',
  ],
  invalid: [
    { code: 'const c = "px-5.5 py-5";', errors: [{ messageId: "offScale" }] },
    { code: 'const el = <div className="py-2.75 gap-0.75 md:w-37.5" />;', errors: 3 },
    { code: 'const c = "size-4.5 -translate-y-1.25";', errors: 2 },
  ],
});

tester.run("kit/no-chart-color-class", kit.rules["no-chart-color-class"], {
  valid: [
    'const c = "border-border bg-muted";',
    { code: 'const c = "bg-chart-grid";', filename: "/app/src/brand/charts/Meter.tsx" },
  ],
  invalid: [
    { code: 'const c = "divide-y border-chart-grid";', filename: "/app/src/pages/x/Row.tsx", errors: [{ messageId: "chart" }] },
    { code: 'const c = "hover:bg-chart-series1";', filename: "/app/src/pages/x/Row.tsx", errors: [{ messageId: "chart" }] },
  ],
});

tester.run("kit/no-display-size", kit.rules["no-display-size"], {
  valid: [
    'const c = "text-figure text-hero text-sm text-xl";',
    { code: 'const c = "text-4xl";', filename: "/app/src/brand/components/variants/statVariants.ts" },
  ],
  invalid: [
    { code: 'const c = "text-3xl font-semibold";', filename: "/app/src/pages/x/A.tsx", errors: [{ messageId: "display" }] },
    { code: 'const c = "text-4xl md:text-5xl";', filename: "/app/src/pages/x/A.tsx", errors: 2 },
  ],
});

tester.run("kit/no-text-arrow", kit.rules["no-text-arrow"], {
  valid: [
    'const label = "View round";',
    "const el = <span>Handicap 1 (hardest) to 18 (easiest)</span>;",
    // A comment can point however it likes.
    "// upload → review\nconst a = 1;",
  ],
  invalid: [
    { code: "const el = <span>View round →</span>;", errors: [{ messageId: "arrow" }] },
    { code: 'const action = "View →";', errors: [{ messageId: "arrow" }] },
    { code: "const el = <span>{`${where} ›`}</span>;", errors: [{ messageId: "arrow" }] },
  ],
});

tester.run("kit/no-handmade-card", kit.rules["no-handmade-card"], {
  valid: [
    'const el = <Card className="gap-1.5 px-5" />;',
    'const el = <div className="bg-card text-card-foreground" />;',
    { code: 'const c = "rounded-surface bg-card shadow-surface";', filename: "/app/src/brand/components/Card.tsx" },
  ],
  invalid: [
    {
      code: 'const SURFACE = "rounded-surface bg-card text-card-foreground shadow-surface";',
      errors: [{ messageId: "card" }],
    },
    {
      code: 'const el = <a className={cn("bg-card shadow-surface", on && "hover:shadow-card")} />;',
      errors: [{ messageId: "card" }],
    },
    { code: 'const el = <div className="grid rounded-surface bg-card" />;', errors: [{ messageId: "card" }] },
  ],
});

tester.run("kit/no-tone-override", kit.rules["no-tone-override"], {
  valid: [
    'const el = <StatDelta tone="good" className="text-body font-semibold" />;',
    'const el = <span className="text-primary" />;',
  ],
  invalid: [
    {
      code: 'const el = <StatDelta tone={v} className={cn("font-semibold", v === "good" && "text-primary")} />;',
      errors: [{ messageId: "tone" }],
    },
    { code: 'const el = <ToParFigure toPar={t} className="text-score-birdie" />;', errors: [{ messageId: "tone" }] },
  ],
});

tester.run("kit/no-handmade-to-par-pill", kit.rules["no-handmade-to-par-pill"], {
  valid: [
    'const c = cn("rounded-full bg-primary", on && "px-2");',
    'const c = cn("font-semibold", toParTextClass(toPar));',
    {
      code: 'const c = cn("rounded-full", toParTextClass(toPar));',
      filename: "/app/src/brand/components/ToParPill.tsx",
    },
  ],
  invalid: [
    {
      code: 'const c = cn("rounded-full bg-background px-3 py-1", toParTextClass(round.toPar));',
      errors: [{ messageId: "pill" }],
    },
    {
      code: 'const c = cn(compact ? "rounded-full px-2" : "rounded-full px-3", cn("font-semibold", toParTextClass(t)));',
      errors: [{ messageId: "pill" }],
    },
  ],
});

tester.run("kit/no-breakpoint-styling", kit.rules["no-breakpoint-styling"], {
  valid: [
    // Which side a sheet opens from is behaviour the CSS can't change.
    'function S() { const wide = useFromBreakpoint("md"); return <Sheet side={wide ? "right" : "bottom"} />; }',
    'function S() { const wide = useFromBreakpoint("md"); return <div className="p-4 md:p-6" />; }',
  ],
  invalid: [
    {
      code: 'function S() { const wide = useFromBreakpoint("md"); return <div className={wide ? "p-6" : "p-4"} />; }',
      errors: [{ messageId: "breakpoint" }],
    },
    {
      code: 'function S() { const wide = useFromBreakpoint("md"); const c = cn("flex", wide && "gap-4"); return c; }',
      errors: [{ messageId: "breakpoint" }],
    },
  ],
});

const PAGE = "/app/src/pages/rounds/RoundsPage.tsx";
const KIT = "/app/src/brand/components/PageTitle.tsx";

tester.run("kit/no-raw-heading", kit.rules["no-raw-heading"], {
  valid: [
    { code: 'const el = <PageTitle size="heading">Half Moon Bay</PageTitle>;', filename: PAGE },
    { code: "const el = <CardTitle level={2}>Round flow</CardTitle>;", filename: PAGE },
    // The kit is where headings are built.
    { code: 'const el = <h1 className="text-title" />;', filename: KIT },
  ],
  invalid: [
    { code: 'const el = <h1 className="text-title">Rounds</h1>;', filename: PAGE, errors: [{ messageId: "title" }] },
    { code: "const el = <h2>vs your average</h2>;", filename: PAGE, errors: [{ messageId: "heading" }] },
  ],
});

tester.run("kit/no-figure-type", kit.rules["no-figure-type"], {
  valid: [
    { code: 'const el = <StatValue size="card">78</StatValue>;', filename: PAGE },
    // `text-figure` lives in the kit's Stat variants.
    { code: 'const el = <div className="text-figure" />;', filename: "/app/src/brand/components/Stat.tsx" },
    { code: 'const el = <span className="text-title" />;', filename: PAGE },
  ],
  invalid: [
    { code: 'const el = <span className="text-figure leading-none">78</span>;', filename: PAGE, errors: [{ messageId: "figure" }] },
    { code: 'const el = <h1 className={cn("md:text-heading", x)} />;', filename: PAGE, errors: [{ messageId: "figure" }] },
    { code: 'const el = <span className="text-hero" />;', filename: PAGE, errors: [{ messageId: "figure" }] },
  ],
});

tester.run("kit/no-button-size-override", kit.rules["no-button-size-override"], {
  valid: [
    { code: 'const el = <Button size="toolbar" className="w-full md:ml-auto" />;', filename: PAGE },
    { code: 'const el = <Button variant="link" size="inline" className="mb-4 self-start" />;', filename: PAGE },
  ],
  invalid: [
    { code: 'const el = <Button className="h-11 rounded-xl px-4" />;', filename: PAGE, errors: [{ messageId: "size" }] },
    { code: 'const el = <DropdownMenuTrigger className="size-11 p-0" />;', filename: PAGE, errors: [{ messageId: "size" }] },
    { code: 'const el = <X render={<Button size="sm" className="group px-0" />} />;', filename: PAGE, errors: [{ messageId: "size" }] },
  ],
});

tester.run("kit/no-handmade-radio", kit.rules["no-handmade-radio"], {
  valid: [
    'const el = <ToggleGroup aria-label="Tee" />;',
    'const el = <div role="group" />;',
    // A kit component's own role prop is its business.
    'const el = <Thing role="radio" />;',
  ],
  invalid: [
    { code: 'const el = <div role="radiogroup" />;', errors: [{ messageId: "role" }] },
    { code: 'const el = <button role="radio" aria-checked />;', errors: [{ messageId: "role" }] },
  ],
});

tester.run("kit/no-format-outside-domain", kit.rules["no-format-outside-domain"], {
  valid: [
    { code: "const s = formatOneDecimal(x);", filename: PAGE },
    { code: "const s = x.toFixed(1);", filename: "/app/src/domain/format.ts" },
    { code: 'const s = d.toLocaleDateString("en-US");', filename: "/app/src/domain/date.ts" },
  ],
  invalid: [
    { code: "const s = x.toFixed(2);", filename: PAGE, errors: [{ messageId: "format" }] },
    { code: 'const s = n.toLocaleString("en-US");', filename: "/app/src/brand/components/X.tsx", errors: [{ messageId: "format" }] },
    { code: 'const f = new Intl.NumberFormat("en-US");', filename: "/app/src/domain/handicap.ts", errors: [{ messageId: "format" }] },
  ],
});
