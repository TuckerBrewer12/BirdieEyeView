import numbers from "./kit-numbers.js";
import structure from "./kit-structure.js";

const BRACKETED = /(-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*)-\[([^\]\s]+)\]/g;
const LENGTH = /\d(?:px|rem|em|%|vh|vw|svh|dvh|ch)(?![a-z])/;
const BARE_NUMBER = /^-?\d*\.?\d+$/;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|oklch|color-mix)\(/;

const COLOR_UTILITY =
  "(?:bg|text|border(?:-[xytblrse])?|ring(?:-offset)?|fill|stroke|from|via|to|divide|shadow|outline|placeholder|accent|decoration|caret)";

const COLOR_VALUE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\(/g;

const PALETTE_CLASS = new RegExp(
  `\\b${COLOR_UTILITY}-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b`,
  "g",
);

const WHITE_BLACK_CLASS = new RegExp(`\\b${COLOR_UTILITY}-(?:white|black)(?![\\w-])`, "g");

const CLASS_START = "(?<=^|[\\s:!])";

const OPACITY_MODIFIER = new RegExp(
  `${CLASS_START}-?(${COLOR_UTILITY})-([a-z][a-z0-9-]*)\\/(?:\\d+(?:\\.\\d+)?|\\[[^\\]\\s]+\\])(?![\\w-])`,
  "g",
);
const TEXT_SIZE = /^(?:xs|sm|base|lg|\d?xl|caption|meta|label|body-sm|body|button-sm|title|hero)$/;
const isLineHeight = ([, utility, colour]) => utility === "text" && TEXT_SIZE.test(colour);

const GRADIENT_STOP = new RegExp(`${CLASS_START}(?:from|via|to)-\\d+(?:\\.\\d+)?%`, "g");

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
        "h-hole-h…), or add a token to brand/theme/tokens.ts if there is none.",
      number:
        "`{{value}}` is an arbitrary Tailwind number. A ratio or a size that matters to the layout belongs in a " +
        "token (a `gridTemplateColumns` entry for column ratios), so the next row that needs it can find it.",
    },
  },
  create(context) {
    const check = (node) => {
      if (!isValueString(node)) return;
      for (const text of stringParts(node)) {
        for (const [value, , inside] of text.matchAll(BRACKETED)) {
          if (LENGTH.test(inside) && !COLOR_FUNCTION.test(inside)) context.report({ node, messageId: "arbitrary", data: { value } });
          else if (BARE_NUMBER.test(inside)) context.report({ node, messageId: "number", data: { value } });
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
        "opacity (bg-primary/wash), or add an opacity token to brand/theme/tokens.ts.",
      stop:
        "`{{value}}` is a hand-picked gradient stop. Let the stops fall evenly, or add a token for the position to " +
        "brand/theme/tokens.ts.",
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
        "anything else add a size token to brand/theme/tokens.ts (like the `profile-*` sizes) and use its utility.",
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

const SPACING_UTILITY =
  "(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|max-w|max-h|inset|inset-x|inset-y|top|right|bottom|left|start|end|translate-x|translate-y|basis|scroll-mt|scroll-pt)";
const FRACTIONAL_STEP = new RegExp(`${CLASS_START}-?${SPACING_UTILITY}-(\\d+\\.\\d+)(?![\\w./-])`, "g");
const HALF_STEPS = new Set(["0.5", "1.5", "2.5", "3.5"]);

const noOffScaleSpacing = {
  meta: {
    type: "problem",
    docs: { description: "Keep spacing on Tailwind's 4px scale, or name the measure as a token." },
    schema: [],
    messages: {
      offScale:
        "`{{value}}` is off the 4px scale. Use a whole step (px-5, gap-4) or one of Tailwind's half steps under 4 " +
        "(0.5–3.5); a measure the design needs exactly gets a name in brand/theme/tokens.ts (`size`), and its " +
        "utility (w-sparkline-card, px-page-phone).",
    },
  },
  create(context) {
    const check = (node) => {
      if (isValueString(node)) {
        reportMatches(context, node, FRACTIONAL_STEP, "offScale", (match) => !HALF_STEPS.has(match[1]));
      }
    };
    return { Literal: check, TemplateLiteral: check };
  },
};

const CHART_COLOR_CLASS = new RegExp(`${CLASS_START}-?${COLOR_UTILITY}-chart-[a-z0-9-]+`, "g");

const noChartColorClass = {
  meta: {
    type: "problem",
    docs: { description: "Chart tokens paint charts; HTML uses the surface and ink tokens." },
    schema: [],
    messages: {
      chart:
        "`{{value}}` uses a chart token on HTML outside the charts. Chart tokens are chart chrome and change with " +
        "the charts; a divider is `border-border`, a track is `bg-muted`.",
    },
  },
  create(context) {
    if (/[\\/]brand[\\/]charts[\\/]/.test(context.filename)) return {};
    const check = (node) => {
      if (isValueString(node)) reportMatches(context, node, CHART_COLOR_CLASS, "chart");
    };
    return { Literal: check, TemplateLiteral: check };
  },
};

const DISPLAY_SIZE = new RegExp(`${CLASS_START}text-[2-9]xl(?![\\w-])`, "g");

const noDisplaySize = {
  meta: {
    type: "problem",
    docs: { description: "Use a type role for a display figure instead of Tailwind's 2xl–9xl." },
    schema: [],
    messages: {
      display:
        "`{{value}}` is a raw display size. Big figures and headings have type roles (text-figure, text-figure-sm, " +
        "text-hero, text-scoreboard, text-display…) that bundle the weight, tracking and line height; a size the " +
        "kit lacks is a new role, or a new size on the component (Stat, PageTitle) whose variants set it.",
    },
  },
  create(context) {
    if (/[\\/]brand[\\/]components[\\/]variants[\\/]/.test(context.filename)) return {};
    const check = (node) => {
      if (isValueString(node)) reportMatches(context, node, DISPLAY_SIZE, "display");
    };
    return { Literal: check, TemplateLiteral: check };
  },
};

const TEXT_ARROW = /[\u2190\u2192\u2039\u203a]/;

const noTextArrow = {
  meta: {
    type: "problem",
    docs: { description: "Draw arrows and chevrons with an icon, not a typed glyph." },
    schema: [],
    messages: {
      arrow:
        "A typed arrow or chevron sizes and colours with the text around it and reads aloud as 'right arrow'. Use " +
        "lucide's ArrowRight / ChevronRight with aria-hidden, as the kit's links and rows do. Prose ranges read as " +
        "words: '1 to 18'.",
    },
  },
  create(context) {
    const check = (node, text) => {
      if (TEXT_ARROW.test(text)) context.report({ node, messageId: "arrow" });
    };
    return {
      JSXText: (node) => check(node, node.value),
      Literal: (node) => {
        if (typeof node.value === "string" && isValueString(node)) check(node, node.value);
      },
      TemplateLiteral: (node) => node.quasis.forEach((q) => check(node, q.value.cooked ?? "")),
    };
  },
};

export default {
  meta: { name: "kit" },
  rules: {
    "no-arbitrary-value": noArbitraryValue,
    "no-color-literal": noColorLiteral,
    "no-fraction-size": noFractionSize,
    "no-opacity-wash": noOpacityWash,
    "no-off-scale-spacing": noOffScaleSpacing,
    "no-chart-color-class": noChartColorClass,
    "no-display-size": noDisplaySize,
    "no-text-arrow": noTextArrow,
    ...numbers.rules,
    ...structure.rules,
  },
};
