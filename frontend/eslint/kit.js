/**
 * Lint rules for styling that skips the brand kit's tokens.
 *
 * Every colour and measure has a token in brand/theme/tokens.css and a Tailwind utility made
 * from it (text-body, w-preview, bg-score-birdie-base). tokens.test.ts already scans
 * src/brand for raw lengths and colours; these rules catch the same mistakes in any file's
 * class strings, as you type. The rules for numbers outside class strings (motion, inline
 * styles, SVG and chart props) are in kit-numbers.js.
 */

import numbers from "./kit-numbers.js";

/**
 * A Tailwind utility with a bracketed length: text-[13px], min-w-[720px], -left-[9999px].
 * Variants (data-[slot=card]:, has-[>svg]:) and layout values with no token (grid-cols-[1fr_auto])
 * are left alone, and a bracketed colour is no-color-literal's to report.
 */
const BRACKETED = /(-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*)-\[([^\]\s]+)\]/g;
const LENGTH = /\d(?:px|rem|em|%|vh|vw|svh|dvh|ch)(?![a-z])/;
/** A colour function's percentages are mix weights, not lengths: that bracket is a colour. */
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|oklch|color-mix)\(/;

/** Tailwind utilities that take a colour: bg-, text-, border-t-, ring-offset-, from-… */
const COLOR_UTILITY =
  "(?:bg|text|border(?:-[xytblrse])?|ring(?:-offset)?|fill|stroke|from|via|to|divide|shadow|outline|placeholder|accent|decoration|caret)";

/** A hex value or a colour function: #ef4444, rgba(, color-mix(. */
export const COLOR_VALUE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\(/g;

/** A raw Tailwind palette class: text-gray-400, border-t-emerald-100. */
export const PALETTE_CLASS = new RegExp(
  `\\b${COLOR_UTILITY}-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b`,
  "g",
);

/**
 * Tailwind's white and black: bg-white, text-white/90, border-black. Only a utility counts, so
 * "white tee" in prose is left alone.
 */
export const WHITE_BLACK_CLASS = new RegExp(`\\b${COLOR_UTILITY}-(?:white|black)(?![\\w-])`, "g");

/** Every colour no-color-literal reports, as one pattern for tokens.test.ts to share. */
export const COLOR_LITERAL = new RegExp(
  [COLOR_VALUE, PALETTE_CLASS, WHITE_BLACK_CLASS].map((r) => r.source).join("|"),
  "g",
);

/** Where a class starts in a class string: the start, a space, a variant's colon, or `!important`. */
const CLASS_START = "(?<=^|[\\s:!])";

/**
 * A colour utility with a numeric opacity modifier: bg-score-birdie/10, text-white/70,
 * border-border/[0.5]. A named opacity token (bg-primary/wash) is fine, and so is a font size's
 * line height (text-sm/6, text-body/7).
 */
const OPACITY_MODIFIER = new RegExp(
  `${CLASS_START}-?(${COLOR_UTILITY})-([a-z][a-z0-9-]*)\\/(?:\\d+(?:\\.\\d+)?|\\[[^\\]\\s]+\\])(?![\\w-])`,
  "g",
);
const TEXT_SIZE = /^(?:xs|sm|base|lg|\d?xl|caption|meta|label|body-sm|body|button-sm|title|hero)$/;
const isLineHeight = ([, utility, colour]) => utility === "text" && TEXT_SIZE.test(colour);

/** A bare gradient stop position: from-10%, via-30%, to-55%. */
const GRADIENT_STOP = new RegExp(`${CLASS_START}(?:from|via|to)-\\d+(?:\\.\\d+)?%`, "g");

/**
 * A fraction size or offset: h-7/25, w-3/7, -translate-y-1/2. Halves, thirds, quarters, sixths
 * and twelfths are the layout grid and stay; aspect ratios (aspect-4/3) are not sizes.
 */
const FRACTION_SIZE = new RegExp(
  `${CLASS_START}-?(?:w|h|size|basis|min-w|min-h|max-w|max-h|inset|inset-x|inset-y|top|right|bottom|left|start|end|translate-x|translate-y)-\\d+\\/(\\d+)(?![\\w/-])`,
  "g",
);
const LAYOUT_DENOMINATORS = new Set(["2", "3", "4", "6", "12"]);

function stringParts(node) {
  if (node.type === "Literal" && typeof node.value === "string") return [node.value];
  if (node.type === "TemplateLiteral") return node.quasis.map((q) => q.value.cooked ?? "");
  return [];
}

function reportMatches(context, node, pattern, messageId, keep = () => true) {
  for (const text of stringParts(node)) {
    for (const match of text.matchAll(pattern)) {
      if (keep(match)) context.report({ node, messageId, data: { value: match[0] } });
    }
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
      whiteBlack:
        "`{{value}}` stays white or black in both colour modes. Use the token for what it sits on: bg-card for a " +
        "surface, text-primary-foreground on a primary fill, text-foreground for body text.",
    },
  },
  create(context) {
    const check = (node) => {
      if (!isValueString(node)) return;
      reportMatches(context, node, COLOR_VALUE, "color");
      reportMatches(context, node, PALETTE_CLASS, "color");
      reportMatches(context, node, WHITE_BLACK_CLASS, "whiteBlack");
    };
    return { Literal: check, TemplateLiteral: check };
  },
};

const noOpacityWash = {
  meta: {
    type: "problem",
    docs: { description: "Use a muted colour token instead of fading a colour with an opacity modifier." },
    schema: [],
    messages: {
      opacity:
        "`{{value}}` fades a colour by hand. Use its `-muted` token (bg-score-birdie-muted, bg-muted), a named " +
        "opacity (bg-primary/wash), or add an opacity token to brand/theme/tokens.css.",
      stop:
        "`{{value}}` is a hand-picked gradient stop. Let the stops fall evenly, or add a token for the position to " +
        "brand/theme/tokens.css.",
    },
  },
  create(context) {
    const check = (node) => {
      if (!isValueString(node)) return;
      reportMatches(context, node, OPACITY_MODIFIER, "opacity", (match) => !isLineHeight(match));
      reportMatches(context, node, GRADIENT_STOP, "stop");
    };
    return { Literal: check, TemplateLiteral: check };
  },
};

const noFractionSize = {
  meta: {
    type: "problem",
    docs: { description: "Use a size token instead of an odd Tailwind fraction." },
    schema: [],
    messages: {
      fraction:
        "`{{value}}` is a fraction off the layout grid. Halves, thirds, quarters, sixths and twelfths are fine; for " +
        "anything else add a size token to brand/theme/tokens.css (like --brand-size-profile-*) and use its utility.",
    },
  },
  create(context) {
    const check = (node) => {
      if (isValueString(node)) {
        reportMatches(context, node, FRACTION_SIZE, "fraction", (match) => !LAYOUT_DENOMINATORS.has(match[1]));
      }
    };
    return { Literal: check, TemplateLiteral: check };
  },
};

export default {
  meta: { name: "kit" },
  rules: {
    "no-arbitrary-value": noArbitraryValue,
    "no-color-literal": noColorLiteral,
    "no-fraction-size": noFractionSize,
    "no-opacity-wash": noOpacityWash,
    ...numbers.rules,
  },
};
