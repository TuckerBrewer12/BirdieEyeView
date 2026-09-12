import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// vitest runs with the frontend package as cwd; import.meta.url is not a
// file: URL under the jsdom environment.
const brandDir = join(process.cwd(), "src", "brand");
const themeDir = join(brandDir, "theme");

const read = (path: string) => readFileSync(path, "utf8");

/** Every source file under src/brand, minus the two that are allowed to hold colors. */
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

const ALLOWED = new Set([join(themeDir, "colors.ts"), join(themeDir, "tokens.css")]);

/** Hex literals, rgb()/hsl()/oklch(), and raw Tailwind palette utilities. */
const COLOR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(|\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|shadow|outline|placeholder|accent|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

describe("brand tokens", () => {
  it("defines every token colors.ts and fonts.ts point at", () => {
    const tokensCss = read(join(themeDir, "tokens.css"));
    const declared = new Set(tokensCss.match(/^\s*(--[\w-]+):/gm)?.map((d) => d.trim().slice(0, -1)));

    const referenced = ["colors.ts", "fonts.ts"].flatMap(
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
      .filter((path) => !ALLOWED.has(path))
      .flatMap((path) => {
        const matches = read(path).match(COLOR_LITERAL) ?? [];
        return matches.map((m) => `${path.slice(brandDir.length + 1)}: ${m}`);
      });

    // Every brand component must reference a token, never a literal.
    expect(offenders).toEqual([]);
  });
});
