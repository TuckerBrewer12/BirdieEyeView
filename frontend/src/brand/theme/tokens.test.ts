import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { colors } from "./tokens";

// vitest runs with the frontend package as cwd; import.meta.url is not a
// file: URL under the jsdom environment.
const srcDir = join(process.cwd(), "src");
const brandDir = join(srcDir, "brand");
const themeDir = join(brandDir, "theme");

const TOKENS_TS = join(themeDir, "tokens.ts");
const TOKENS_CSS = join(themeDir, "tokens.gen.css");
/** Writes tokens.ts out as CSS, so it spells `color-mix()` for a mixed token. */
const TOKENS_GENERATOR = join(themeDir, "tokensCss.ts");
const API_TYPES = join(srcDir, "types", "api.gen.ts");

const read = (path: string) => readFileSync(path, "utf8");

/** Drop comments so docs can mention `#fff` or `9px` without failing the test. */
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/** Every .ts, .tsx and .css file under `dir`, minus test folders when asked. */
function sources(dir: string, { skipTests }: { skipTests: boolean }, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!(skipTests && entry.name === "tests")) sources(path, { skipTests }, found);
    } else if (/\.(ts|tsx|css)$/.test(entry.name) && !(skipTests && /\.(test|spec)\./.test(entry.name))) {
      found.push(path);
    }
  }
  return found;
}

/** Hex literals, rgb()/hsl()/oklch()/color-mix(), and raw Tailwind palette utilities. */
const COLOR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\(|\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|shadow|outline|placeholder|accent|decoration)-(?:white|black)\b|\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|shadow|outline|placeholder|accent|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

/** Raw lengths. Tailwind scale classes (p-4, text-sm) do not match. */
const UNIT_LITERAL = /[-+]?\d+(?:\.\d+)?(?:px|rem|em)\b/g;

function offenders(files: string[], pattern: RegExp, allowed: Set<string>) {
  return files
    .filter((path) => !allowed.has(path))
    .flatMap((path) => {
      const matches = withoutComments(read(path)).match(pattern) ?? [];
      return matches.map((m) => `${path.slice(srcDir.length + 1)}: ${m}`);
    });
}

describe("brand tokens", () => {
  it("are the only place in the app holding a colour", () => {
    // A colour belongs in tokens.ts, reached through its utility or color().
    const allowed = new Set([TOKENS_TS, TOKENS_GENERATOR, TOKENS_CSS, API_TYPES]);
    expect(offenders(sources(srcDir, { skipTests: false }), COLOR_LITERAL, allowed)).toEqual([]);
  });

  it("are the only place in the brand layer holding a px/rem/em length", () => {
    const allowed = new Set([TOKENS_TS, TOKENS_CSS]);
    expect(offenders(sources(brandDir, { skipTests: true }), UNIT_LITERAL, allowed)).toEqual([]);
  });

  it("define every custom property the generated CSS refers to", () => {
    const css = read(TOKENS_CSS);
    const declared = new Set(css.match(/^\s*(--[\w-]+):/gm)?.map((d) => d.trim().slice(0, -1)));
    const referenced = [...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]);

    // A typo or a deleted token would silently render as no value at all.
    expect([...new Set(referenced)].filter((name) => !declared.has(name))).toEqual([]);
  });

  it("match the native shell's colours to the tokens they copy", () => {
    // Capacitor's config is read by the native build, which cannot import the
    // app's TypeScript, so it holds the splash and status bar colours a second time.
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
      splash: colors.light.primary,
      statusBar: colors.light.background,
      android: colors.light.background,
    });
  });
});
