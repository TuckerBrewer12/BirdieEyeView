/**
 * Lint rules for kit pieces rebuilt by hand in a page: a card made from the card's own classes,
 * a to-par pill made from the to-par colour, a tone painted over the component that owns it,
 * styling picked in JS by breakpoint.
 *
 * A copy looks right the day it's written and drifts the day the kit changes. These rules point
 * at the kit piece to use instead; kit.js covers the class strings themselves.
 */

/** Every string a class expression carries: a literal, a template's text, cn()'s arguments, both sides of a ternary. */
function classStrings(node) {
  if (!node) return [];
  switch (node.type) {
    case "Literal":
      return typeof node.value === "string" ? [node.value] : [];
    case "TemplateLiteral":
      return [...node.quasis.map((q) => q.value.cooked ?? ""), ...node.expressions.flatMap(classStrings)];
    case "JSXExpressionContainer":
      return classStrings(node.expression);
    case "ConditionalExpression":
      return [...classStrings(node.consequent), ...classStrings(node.alternate)];
    case "LogicalExpression":
      return [...classStrings(node.left), ...classStrings(node.right)];
    case "CallExpression":
      return node.arguments.flatMap(classStrings);
    case "ArrayExpression":
      return node.elements.flatMap(classStrings);
    case "ObjectExpression":
      return node.properties.flatMap((p) => (p.type === "Property" ? classStrings(p.value) : []));
    default:
      return [];
  }
}

/** The calls inside a class expression: `toParTextClass(x)` in `cn("…", toParTextClass(x))`. */
function calleeNames(node, names = []) {
  if (!node || typeof node !== "object") return names;
  if (node.type === "CallExpression" && node.callee.type === "Identifier") names.push(node.callee.name);
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => calleeNames(c, names));
    else if (child && typeof child.type === "string") calleeNames(child, names);
  }
  return names;
}

const hasClass = (strings, cls) => strings.some((s) => new RegExp(`(?:^|[\\s:])${cls}(?![\\w-])`).test(s));

/** The class strings a JSX element is given. */
function classNameOf(opening) {
  const attr = opening.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === "className");
  return attr?.value ? attr.value : null;
}

const noHandmadeCard = {
  meta: {
    type: "problem",
    docs: { description: "Use the kit's Card instead of rebuilding its surface from its classes." },
    schema: [],
    messages: {
      card:
        "`bg-card` with `{{other}}` is the kit's Card surface rebuilt by hand. Use <Card> (or <CardLink> for a " +
        "card that is a link, `corner` for the rounder lead card), so a change to the card reaches every one.",
    },
  },
  create(context) {
    // Card itself is where the surface's classes live.
    if (/[\\/]brand[\\/]components[\\/]Card\.tsx$/.test(context.filename)) return {};
    const check = (node) => {
      const strings = classStrings(node);
      if (!hasClass(strings, "bg-card")) return;
      const other = ["shadow-surface", "rounded-surface"].find((cls) => hasClass(strings, cls));
      if (other) context.report({ node, messageId: "card", data: { other } });
    };
    return {
      // One report per class expression: the outermost literal or call a string sits in.
      "JSXAttribute[name.name='className'] > JSXExpressionContainer"(node) {
        check(node.expression);
      },
      "JSXAttribute[name.name='className'] > Literal": check,
      "VariableDeclarator > Literal"(node) {
        check(node);
      },
    };
  },
};

/** Text colour utilities a tone sets: the brand, the inks and the score colours. */
const TEXT_COLOR = /(?:^|[\s:])text-(?:primary|destructive|foreground|foreground-secondary|muted-foreground|card-foreground|score-[a-z]+)(?![\w-])/;
/** Kit components that paint their own text by a tone or a value. */
const TONED = new Set(["StatDelta", "ToParFigure", "ToParPill"]);

const noToneOverride = {
  meta: {
    type: "problem",
    docs: { description: "Let a toned kit component paint itself instead of overriding its colour." },
    schema: [],
    messages: {
      tone:
        "<{{name}}> picks its own colour from its tone or value. A text colour in its className paints over it, so " +
        "the same figure shows in two colours across screens. Change the colour in the component instead.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || !TONED.has(node.name.name)) return;
        const value = classNameOf(node);
        if (value && classStrings(value).some((s) => TEXT_COLOR.test(s))) {
          context.report({ node, messageId: "tone", data: { name: node.name.name } });
        }
      },
    };
  },
};

const noHandmadeToParPill = {
  meta: {
    type: "problem",
    docs: { description: "Use the kit's ToParPill instead of building a to-par pill from its colour." },
    schema: [],
    messages: {
      pill:
        "A `rounded-full` box coloured by `toParTextClass()` is a to-par pill. Use <ToParPill> from @/brand " +
        "(or <ToParFigure> for the bare figure), so every pill reads the same.",
    },
  },
  create(context) {
    // ToParPill is where the pill is built.
    if (/[\\/]brand[\\/]components[\\/]ToParPill\.tsx$/.test(context.filename)) return {};
    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "cn") return;
        // Only the outermost cn() reports, so a nested one isn't counted twice.
        if (node.parent?.type === "CallExpression" && node.parent.callee.name === "cn") return;
        if (!hasClass(classStrings(node), "rounded-full")) return;
        if (calleeNames(node).includes("toParTextClass")) context.report({ node, messageId: "pill" });
      },
    };
  },
};

const noBreakpointStyling = {
  meta: {
    type: "problem",
    docs: { description: "Style by breakpoint with `md:` classes, not a JS breakpoint." },
    schema: [],
    messages: {
      breakpoint:
        "`{{name}}` comes from useFromBreakpoint(), which is for behaviour the CSS can't change (which side a " +
        "sheet opens from). Sizes, spacing and type by breakpoint are `md:` classes, so the first paint is right " +
        "and the page doesn't style the same thing two ways.",
    },
  },
  create(context) {
    const fromBreakpoint = new Set();
    return {
      "VariableDeclarator[init.callee.name='useFromBreakpoint'] > Identifier.id"(node) {
        fromBreakpoint.add(node.name);
      },
      Identifier(node) {
        if (!fromBreakpoint.has(node.name) || node.parent.type === "VariableDeclarator") return;
        // Inside a className, or inside a cn() call.
        for (let at = node.parent; at; at = at.parent) {
          const inClassName = at.type === "JSXAttribute" && at.name.name === "className";
          const inCn = at.type === "CallExpression" && at.callee.type === "Identifier" && at.callee.name === "cn";
          if (inClassName || inCn) {
            context.report({ node, messageId: "breakpoint", data: { name: node.name } });
            return;
          }
          if (at.type === "JSXOpeningElement" || at.type.startsWith("Function") || at.type === "ArrowFunctionExpression") return;
        }
      },
    };
  },
};

export default {
  rules: {
    "no-handmade-card": noHandmadeCard,
    "no-tone-override": noToneOverride,
    "no-handmade-to-par-pill": noHandmadeToParPill,
    "no-breakpoint-styling": noBreakpointStyling,
  },
};
