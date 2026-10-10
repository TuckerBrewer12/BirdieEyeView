/**
 * Lint rules for styling that skips the brand kit's tokens.
 *
 * Every colour and measure has a token in brand/theme/tokens.css and a Tailwind utility made
 * from it (text-body, w-preview, bg-score-birdie-base). tokens.test.ts already scans
 * src/brand for raw lengths and colours; these rules catch the same mistakes in any file's
 * class strings, as you type.
 */

/**
 * A Tailwind utility with a bracketed length: text-[13px], min-w-[720px], -left-[9999px].
 * Variants (data-[slot=card]:, has-[>svg]:) and layout values with no token (grid-cols-[1fr_auto])
 * are left alone, and a bracketed colour is no-color-literal's to report.
 */
const BRACKETED = /(-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*)-\[([^\]\s]+)\]/g;
const LENGTH = /\d(?:px|rem|em|%|vh|vw|svh|dvh|ch)(?![a-z])/;
/** A colour function's percentages are mix weights, not lengths: that bracket is a colour. */
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|oklch|color-mix)\(/;

const COLOR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\(|\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|shadow|outline|placeholder|accent|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

function stringParts(node) {
  if (node.type === "Literal" && typeof node.value === "string") return [node.value];
  if (node.type === "TemplateLiteral") return node.quasis.map((q) => q.value.cooked ?? "");
  return [];
}

function reportMatches(context, node, pattern, messageId) {
  for (const text of stringParts(node)) {
    for (const [value] of text.matchAll(pattern)) context.report({ node, messageId, data: { value } });
  }
}

/** Skip strings that are imports, object keys or type positions: only values can style. */
function isValueString(node) {
  const parent = node.parent;
  if (!parent) return true;
  if (parent.type === "ImportDeclaration" || parent.type === "ExportNamedDeclaration") return false;
  if (parent.type === "ExportAllDeclaration" || parent.type === "ImportExpression") return false;
  if (parent.type === "Property" && parent.key === node) return false;
  if (parent.type === "TSLiteralType") return false;
  return true;
}

const noArbitraryValue = {
  meta: {
    type: "problem",
    docs: { description: "Use a token utility instead of an arbitrary Tailwind value." },
    schema: [],
    messages: {
      arbitrary:
        "`{{value}}` is an arbitrary Tailwind length. Use the token utility for it (text-body, w-preview, " +
        "h-hole-h…), or add a token to brand/theme/tokens.css if there is none.",
    },
  },
  create(context) {
    const check = (node) => {
      if (!isValueString(node)) return;
      for (const text of stringParts(node)) {
        for (const [value, , inside] of text.matchAll(BRACKETED)) {
          if (LENGTH.test(inside) && !COLOR_FUNCTION.test(inside)) context.report({ node, messageId: "arbitrary", data: { value } });
        }
      }
    };
    return { Literal: check, TemplateLiteral: check };
  },
};

const noColorLiteral = {
  meta: {
    type: "problem",
    docs: { description: "Use a colour token instead of a hex value or raw palette class." },
    schema: [],
    messages: {
      color:
        "`{{value}}` is a colour that skips the brand tokens. Use a token utility (bg-card, text-muted-foreground, " +
        "text-score-birdie) or `colors.*` from @/brand/theme, so it follows dark mode.",
    },
  },
  create(context) {
    const check = (node) => {
      if (isValueString(node)) reportMatches(context, node, COLOR_LITERAL, "color");
    };
    return { Literal: check, TemplateLiteral: check };
  },
};

export default {
  meta: { name: "kit" },
  rules: {
    "no-arbitrary-value": noArbitraryValue,
    "no-color-literal": noColorLiteral,
  },
};
