import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// vitest runs with the frontend package as cwd; import.meta.url is not a
// file: URL under the jsdom environment.
const brandDir = join(process.cwd(), "src", "brand");
const themeDir = join(brandDir, "theme");

const read = (path: string) => readFileSync(path, "utf8");

/** Drop comments so docs can mention `#fff` or `9px` without failing the test. */
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/** Every source file under src/brand, minus tests. */
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

/** Hex literals, rgb()/hsl()/oklch(), and raw Tailwind palette utilities. */
const COLOR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(|\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|shadow|outline|placeholder|accent|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

/** Raw lengths. Tailwind scale classes (p-4, text-sm) do not match. */
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

    // A typo or a deleted token here would silently render as no value at all.
    expect(dangling).toEqual([]);
  });

  it("is the only place in the brand layer holding a color", () => {
    const offenders = brandSources(brandDir)
      .filter((path) => !COLOR_ALLOWED.has(path))
      .flatMap((path) => {
        const matches = withoutComments(read(path)).match(COLOR_LITERAL) ?? [];
        return matches.map((m) => `${path.slice(brandDir.length + 1)}: ${m}`);
      });

    // Every brand component must reference a token, never a literal.
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
});
