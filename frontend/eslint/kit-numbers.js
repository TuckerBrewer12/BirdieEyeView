/**
 * Lint rules for styling numbers that skip the brand kit's tokens.
 *
 * kit.js reads strings: a class name or a hex. Much of the kit's styling never passes through a
 * string, though. Framer Motion takes a duration as a number, an inline style takes a font size
 * as a number, and an SVG or Recharts prop takes a radius as a number. These rules catch a raw
 * number in those places and point at the token that already holds it: brand/theme/motion.ts
 * for motion, tokens.css (through a Tailwind utility or `typography` / `space` / `size` /
 * `radius`) for measures, and `chartLayout` in brand/theme/chart.ts for charts.
 *
 * 0 is never reported: it is the absence of a measure, not a choice of one. For motion 1 is
 * left alone too, since `scale: 1` is an element's natural size and `opacity: 1` its full self.
 */

/** Packages a file imports motion from. */
const MOTION_SOURCES = new Set(["framer-motion", "motion/react"]);

/** Framer Motion props that take a target, a transition, or variants made of them. */
const MOTION_ATTRS = new Set([
  "initial", "animate", "exit", "whileHover", "whileTap", "whileFocus", "whileInView", "transition", "variants",
]);

/** Keys whose number is a motion choice: how long, how far it grows, how the spring feels. */
const MOTION_KEYS = new Set([
  "duration", "scale", "scaleX", "scaleY", "damping", "stiffness", "mass", "bounce", "staggerChildren", "delayChildren",
]);

/** A timing in a file that animates: `fadeDuration`, `{ crossfade: 0.8 }`, `caretBlink`. */
const TIMING_KEY = /(?:duration|crossfade|fade|sweep|blink)$/i;

const MEASURE_KEY =
  /^(?:fontSize|lineHeight|letterSpacing|borderRadius|width|height|minWidth|maxWidth|minHeight|maxHeight|top|right|bottom|left|inset|gap|rowGap|columnGap|margin\w*|padding\w*)$/;
const COLOR_KEYS = new Set(["color", "background", "backgroundColor", "fill", "stroke", "borderColor", "outlineColor"]);
/** CSS keywords a colour key can take that are not a colour choice. */
const COLOR_KEYWORDS = new Set(["transparent", "currentcolor", "inherit", "initial", "unset", "none"]);
/** A length written as a string: "12px", "1.5rem", "0 4px". */
const LENGTH = /\d(?:px|rem|em)(?![a-z])/;

const MEASURE_PROPS = new Set([
  "strokeWidth", "rx", "ry", "r", "innerRadius", "outerRadius", "cornerRadius", "maxBarSize", "barSize", "barGap",
  "fontSize", "strokeDasharray", "stopOpacity", "fillOpacity", "strokeOpacity", "tickSize", "tickMargin",
]);
/** Opacity of 1 is the default, not a measure. */
const OPACITY_PROPS = new Set(["stopOpacity", "fillOpacity", "strokeOpacity"]);

/** The number a literal holds, `-3` included, or null for anything computed. */
function numberOf(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "number") return node.value;
  if (node.type === "UnaryExpression" && (node.operator === "-" || node.operator === "+")) {
    const n = numberOf(node.argument);
    return n === null ? null : node.operator === "-" ? -n : n;
  }
  return null;
}

/** The text of a string literal or a template with no `${}`, or null. `"spring" as const` reads as "spring". */
function stringOf(node) {
  if (!node) return null;
  if (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression") return stringOf(node.expression);
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0].value.cooked ?? "";
  return null;
}

function keyOf(property) {
  if (property.type !== "Property" || property.computed) return null;
  if (property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal" && typeof property.key.value === "string") return property.key.value;
  return null;
}

/** How a value reads in a message: the source text, so `-3` and `[1, 1.2, 1]` show as written. */
function shown(context, node) {
  return context.sourceCode.getText(node);
}

/** The motion number a value holds that is neither 0 nor 1: a literal, or one inside a keyframe array. */
function isRawMotion(node) {
  const n = numberOf(node);
  if (n !== null) return n !== 0 && n !== 1;
  if (node.type === "ArrayExpression") return node.elements.some((el) => el && isRawMotion(el));
  return false;
}

function importsFrom(program, sources) {
  return program.body.some((s) => s.type === "ImportDeclaration" && sources.has(s.source.value));
}

/** The object literals an expression may evaluate to: both sides of `a ? {…} : {…}` and `a && {…}`. */
function objectsIn(node) {
  if (!node) return [];
  if (node.type === "ObjectExpression") return [node];
  if (node.type === "ConditionalExpression") return [...objectsIn(node.consequent), ...objectsIn(node.alternate)];
  if (node.type === "LogicalExpression") return [...objectsIn(node.left), ...objectsIn(node.right)];
  if (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression") return objectsIn(node.expression);
  return [];
}

const noRawMotion = {
  meta: {
    type: "problem",
    docs: { description: "Use a motion token instead of a raw duration, scale or spring number." },
    schema: [],
    messages: {
      motion:
        "`{{key}}: {{value}}` is a raw motion number. Use a token from brand/theme/motion.ts (motion.hoverScale, " +
        "motion.tapScale, motion.spring, motion.duration.collapse, motion.draw, motion.pop, motion.entrance, " +
        "motion.layout), or add one there.",
    },
  },
  create(context) {
    const reported = new Set();
    const report = (property) => {
      if (reported.has(property)) return;
      reported.add(property);
      context.report({
        node: property.value,
        messageId: "motion",
        data: { key: keyOf(property), value: shown(context, property.value) },
      });
    };

    /** Every motion key in a target, transition or variants object, at any depth. */
    const checkMotionObject = (object) => {
      for (const property of object.properties) {
        const key = keyOf(property);
        if (key === null) continue;
        if (MOTION_KEYS.has(key) && isRawMotion(property.value)) report(property);
        for (const inner of objectsIn(property.value)) checkMotionObject(inner);
      }
    };

    let animates = false;
    return {
      Program(program) {
        animates = importsFrom(program, MOTION_SOURCES);
      },
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || !MOTION_ATTRS.has(node.name.name)) return;
        if (node.value?.type !== "JSXExpressionContainer") return;
        for (const object of objectsIn(node.value.expression)) checkMotionObject(object);
      },
      CallExpression(node) {
        // animate(el, { scale: 1.1 }, { duration: 0.3 }), from the import or from useAnimate().
        if (node.callee.type !== "Identifier" || node.callee.name !== "animate") return;
        for (const arg of node.arguments.slice(1, 3)) for (const object of objectsIn(arg)) checkMotionObject(object);
      },
      Property(node) {
        const key = keyOf(node);
        if (key === null) return;
        // A spring is motion wherever it is written: `rowSpring: { type: "spring", damping: 15 }`.
        if (MOTION_KEYS.has(key) && node.parent.type === "ObjectExpression") {
          const isSpring = node.parent.properties.some((p) => keyOf(p) === "type" && stringOf(p.value) === "spring");
          if (isSpring && isRawMotion(node.value)) report(node);
        }
        // A timings table in a file that animates: `{ crossfade: 0.8, sweep: 1.5 }`.
        if (animates && TIMING_KEY.test(key) && isRawMotion(node.value)) report(node);
      },
    };
  },
};

const noStyleMeasure = {
  meta: {
    type: "problem",
    docs: { description: "Use a token instead of a raw measure or colour in an inline style." },
    schema: [],
    messages: {
      measure:
        "`{{key}}: {{value}}` is a raw measure in an inline style. Use the token utility in className " +
        "(text-meta, rounded-full, gap-tight, w-preview…), or `typography`, `space`, `size` or `radius` from " +
        "@/brand/theme when it has to be a style. Add a token to brand/theme/tokens.css if there is none.",
      color:
        "`{{key}}: {{value}}` is an inline colour that skips the brand tokens. Use `colors.*` or `toParFill(...)` " +
        "from @/brand/theme, or a token utility (bg-card, text-score-birdie), so it follows dark mode.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "style") return;
        if (node.value?.type !== "JSXExpressionContainer") return;
        for (const object of objectsIn(node.value.expression)) {
          for (const property of object.properties) {
            const key = keyOf(property);
            // CSS custom properties ("--bar") hand a value to a class; what it holds is the class's business.
            if (key === null || key.startsWith("--")) continue;
            const value = property.value;
            const data = { key, value: shown(context, value) };
            if (MEASURE_KEY.test(key)) {
              const n = numberOf(value);
              const text = stringOf(value);
              if ((n !== null && n !== 0) || (text !== null && LENGTH.test(text))) {
                context.report({ node: value, messageId: "measure", data });
              }
            } else if (COLOR_KEYS.has(key)) {
              const text = stringOf(value);
              if (text === null || text.includes("var(") || COLOR_KEYWORDS.has(text.trim().toLowerCase())) continue;
              context.report({ node: value, messageId: "color", data });
            }
          }
        }
      },
    };
  },
};

const noMeasureProp = {
  meta: {
    type: "problem",
    docs: { description: "Use a chart or size token instead of a raw number in an SVG, Recharts or icon prop." },
    schema: [],
    messages: {
      measure:
        "`{{name}}={{value}}` is a raw chart measure. Use `chartLayout` from brand/theme/chart.ts (ring, gauge, " +
        "barRadius, barMaxWidth, plot, sparkline, trend, flow) or a size, space or radius token from " +
        "brand/theme/tokens.css, or add one there.",
      icon:
        "`size={{value}}` sizes an icon with a raw number. Size it with a className (size-icon-xs, size-4), " +
        "or add a size token to brand/theme/tokens.css.",
    },
  },
  create(context) {
    const icons = new Set();

    /** The raw measure an attribute value holds: a number other than 0, or a string with a digit in it. */
    const rawValue = (value, allowOne) => {
      if (!value) return false;
      if (value.type === "JSXExpressionContainer") value = value.expression;
      const n = numberOf(value);
      if (n !== null) return n !== 0 && !(allowOne && n === 1);
      const text = stringOf(value);
      return text !== null && /\d/.test(text);
    };

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "lucide-react") return;
        for (const spec of node.specifiers) icons.add(spec.local.name);
      },
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") return;
        const name = node.name.name;
        const value = shown(context, node.value ?? node.name);
        if (MEASURE_PROPS.has(name)) {
          if (rawValue(node.value, OPACITY_PROPS.has(name))) {
            context.report({ node, messageId: "measure", data: { name, value } });
          }
          return;
        }
        if (name === "size") {
          const element = node.parent.name;
          if (element.type !== "JSXIdentifier" || !icons.has(element.name)) return;
          if (rawValue(node.value, false)) context.report({ node, messageId: "icon", data: { value } });
        }
      },
    };
  },
};

export default {
  rules: {
    "no-raw-motion": noRawMotion,
    "no-style-measure": noStyleMeasure,
    "no-measure-prop": noMeasureProp,
  },
};
