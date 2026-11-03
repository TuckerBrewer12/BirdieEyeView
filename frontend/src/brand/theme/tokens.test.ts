import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { breakpoints } from "./breakpoints";
import { chartLayout } from "./chart";

const brandDir = join(process.cwd(), "src", "brand");
const themeDir = join(brandDir, "theme");

const read = (path: string) => readFileSync(path, "utf8");

function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function brandSources(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "tests") brandSources(path, found);
    } else if (/\.(ts|tsx|css)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) {
      found.push(path);
    }
  }
  return found;
}

const TOKENS_CSS = join(themeDir, "tokens.css");
const COLOR_ALLOWED = new Set([join(themeDir, "colors.ts"), TOKENS_CSS]);
const UNIT_ALLOWED = new Set([TOKENS_CSS]);

const COLOR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\(|\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|shadow|outline|placeholder|accent|decoration)-(?:white|black)\b|\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|shadow|outline|placeholder|accent|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

const UNIT_LITERAL = /[-+]?\d+(?:\.\d+)?(?:px|rem|em)\b/g;

describe("brand tokens", () => {
  it("defines every token the theme TypeScript files point at", () => {
    const tokensCss = read(TOKENS_CSS);
    const declared = new Set(tokensCss.match(/^\s*(--[\w-]+):/gm)?.map((d) => d.trim().slice(0, -1)));

    const referenced = ["colors.ts", "fonts.ts", "chart.ts", "type.ts", "space.ts"].flatMap(
      (file) => read(join(themeDir, file)).match(/var\((--[\w-]+)\)/g) ?? [],
    );
    const dangling = [...new Set(referenced.map((r) => r.slice(4, -1)))].filter(
      (name) => !declared.has(name),
    );

    expect(dangling).toEqual([]);
  });

  it("is the only place in the brand layer holding a color", () => {
    const offenders = brandSources(brandDir)
      .filter((path) => !COLOR_ALLOWED.has(path))
      .flatMap((path) => {
        const matches = withoutComments(read(path)).match(COLOR_LITERAL) ?? [];
        return matches.map((m) => `${path.slice(brandDir.length + 1)}: ${m}`);
      });

    expect(offenders).toEqual([]);
  });

  it("is the only place in the brand layer holding a px/rem/em length", () => {
    const offenders = brandSources(brandDir)
      .filter((path) => !UNIT_ALLOWED.has(path))
      .flatMap((path) => {
        const matches = withoutComments(read(path)).match(UNIT_LITERAL) ?? [];
        return matches.map((m) => `${path.slice(brandDir.length + 1)}: ${m}`);
      });

    expect(offenders).toEqual([]);
  });

  it("matches the native shell's colours to the tokens they copy", () => {
    // Capacitor's config is read by the native build, which cannot see CSS,
    // so it holds the splash and status bar colours a second time.
    const lightBlock = read(TOKENS_CSS).match(/^:root \{([\s\S]*?)^\}/m)?.[1] ?? "";
    const token = (name: string) =>
      lightBlock.match(new RegExp(`^\\s*${name}:\\s*(#[0-9a-fA-F]{3,8});`, "m"))?.[1].toLowerCase();
    const capacitor = read(join(process.cwd(), "capacitor.config.ts"));
    const colourIn = (block: string) =>
      capacitor
        .match(new RegExp(`${block}:\\s*\\{[^}]*?backgroundColor:\\s*'(#[0-9a-fA-F]{3,8})'`))?.[1]
        .toLowerCase();

    expect({
      splash: colourIn("SplashScreen"),
      statusBar: colourIn("StatusBar"),
      android: colourIn("android"),
    }).toEqual({
      splash: token("--primary"),
      statusBar: token("--background"),
      android: token("--background"),
    });
    expect(token("--primary")).toBeDefined();
    expect(token("--background")).toBeDefined();
  });

  it("matches every breakpoint to the one tokens.css pins", () => {
    const tokensCss = read(TOKENS_CSS);
    for (const [name, width] of Object.entries(breakpoints)) {
      const pinned = tokensCss.match(new RegExp(`--breakpoint-${name}:\\s*([\\d.]+)rem;`));
      expect(pinned, `--breakpoint-${name} in tokens.css`).not.toBeNull();
      expect(Number(pinned![1]), `breakpoints.${name}`).toBe(width);
    }
  });

  it("matches every chart measure to the token it mirrors", () => {
    const tokensCss = read(TOKENS_CSS);
    const px = (name: string) => {
      const value = tokensCss.match(new RegExp(`${name}:\\s*([\\d.]+)(px|rem)`));
      if (!value) throw new Error(`${name} is not a px or rem length in tokens.css`);
      return Number(value[1]) * (value[2] === "rem" ? 16 : 1);
    };

    expect({
      barRadius: chartLayout.barRadius[0],
      barMaxWidth: chartLayout.barMaxWidth,
      ringInner: chartLayout.ring.inner,
      ringOuter: chartLayout.ring.outer,
      gaugeInner: chartLayout.gauge.inner,
      gaugeOuter: chartLayout.gauge.outer,
      plotHeight: chartLayout.plot.height,
      plotCompactWidth: chartLayout.plotCompact.width,
      plotCompactHeight: chartLayout.plotCompact.height,
      sparklineWidth: chartLayout.sparkline.width,
      sparklineHeight: chartLayout.sparkline.height,
      sparklinePad: chartLayout.sparkline.pad,
      sparklineStroke: chartLayout.sparkline.stroke,
      sparklineDot: chartLayout.sparkline.dot,
      trendHeight: chartLayout.trend.height,
      flowWidth: chartLayout.flow.width,
      trendAreaHeight: chartLayout.trendArea.height,
      radarCompactWidth: chartLayout.radarCompact.width,
      radarCompactHeight: chartLayout.radarCompact.height,
      radarCompactRadius: chartLayout.radarCompact.radius,
      radarCompactLabelGap: chartLayout.radarCompact.labelGap,
      radarCompactValueGap: chartLayout.radarCompact.valueGap,
    }).toEqual({
      barRadius: px("--brand-radius-md"),
      barMaxWidth: px("--brand-size-bar-max"),
      ringInner: px("--brand-size-ring-inner"),
      ringOuter: px("--brand-size-ring-outer"),
      gaugeInner: px("--brand-size-gauge-inner"),
      gaugeOuter: px("--brand-size-gauge-outer"),
      plotHeight: px("--brand-size-chart"),
      plotCompactWidth: px("--brand-size-chart-compact-w"),
      plotCompactHeight: px("--brand-size-chart-compact"),
      sparklineWidth: px("--brand-size-sparkline-w"),
      sparklineHeight: px("--brand-size-sparkline-h"),
      sparklinePad: px("--brand-space-tight"),
      sparklineStroke: px("--brand-sparkline-stroke"),
      sparklineDot: px("--brand-space-dot"),
      trendHeight: px("--brand-size-chart"),
      flowWidth: px("--brand-size-chart-wide"),
      trendAreaHeight: px("--brand-size-chart"),
      radarCompactWidth: px("--brand-size-radar-compact-w"),
      radarCompactHeight: px("--brand-size-radar-compact-h"),
      radarCompactRadius: px("--brand-size-radar-compact-r"),
      radarCompactLabelGap: px("--brand-space-radar-compact-label"),
      radarCompactValueGap: px("--brand-space-radar-compact-label"),
    });
  });
});
