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
        "`bg-card` with `{{other}}` is the kit's Card surface rebuilt by hand. Use <Card> (with `render={<Link />}` and `interactive` for a " +
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
      passThrough:
        "`{{name}}` from useFromBreakpoint() is handed to a prop, where the component can style by it out of " +
        "this rule's sight. Pick what to render with it here, and let the component style by `md:` classes.",
      words:
        "Words picked by `{{name}}` from useFromBreakpoint() change after the first paint. Render both and show " +
        "each with `md:hidden` / `hidden md:inline`.",
    },
  },
  create(context) {
    const fromBreakpoint = new Set();
    /** The breakpoint value itself, or its negation. */
    const isValue = (node) =>
      (node.type === "Identifier" && fromBreakpoint.has(node.name)) ||
      (node.type === "UnaryExpression" && node.operator === "!" && isValue(node.argument));
    const nameOf = (node) => (node.type === "Identifier" ? node.name : nameOf(node.argument));
    const isText = (node) => node.type === "Literal" && typeof node.value === "string";
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
      // `<Table wide={wide} />`: the value passed on for the component to style by.
      "JSXAttribute > JSXExpressionContainer"(node) {
        if (node.parent.name.name === "className" || !isValue(node.expression)) return;
        context.report({ node, messageId: "passThrough", data: { name: nameOf(node.expression) } });
      },
      // `wide ? "Your avg" : "Avg"`: words by breakpoint. A prop's value picked this way is behaviour
      // (`side={wide ? "right" : "bottom"}`), so only words outside a prop are flagged.
      ConditionalExpression(node) {
        if (!isValue(node.test) || !isText(node.consequent) || !isText(node.alternate)) return;
        if (node.parent.type === "JSXExpressionContainer" && node.parent.parent.type === "JSXAttribute") return;
        context.report({ node, messageId: "words", data: { name: nameOf(node.test) } });
      },
    };
  },
};

/** A page's file, as against the kit's: the kit is where headings, figures and sizes are built. */
const inKit = (filename) => /[\\/]src[\\/]brand[\\/]/.test(filename);

const noRawHeading = {
  meta: {
    type: "problem",
    docs: { description: "Use the kit's title pieces instead of a raw heading in a page." },
    schema: [],
    messages: {
      title:
        "A raw <h1> in a page sets its own type. Use <PageTitle> (with its `size` for a heading or a landing " +
        "headline), so every page title follows the kit.",
      heading:
        "A raw <{{tag}}> in a page sets its own type. Head a card with <CardHeader><CardTitle render={<{{tag}} />}>, " +
        "or a section with <SectionLabel>, so the heading follows the kit.",
    },
  },
  create(context) {
    if (inKit(context.filename)) return {};
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || !/^h[1-6]$/.test(node.name.name)) return;
        const tag = node.name.name;
        context.report({ node, messageId: tag === "h1" ? "title" : "heading", data: { tag } });
      },
    };
  },
};

/** The type roles a kit piece owns: figures (Stat), page headings and headlines (PageTitle). */
const FIGURE_TYPE = /(?:^|[\s:])text-(figure(?:-sm|-lg)?|display(?:-sm|-lg)?|hero|heading|stat)(?![\w-])/;

const noFigureType = {
  meta: {
    type: "problem",
    docs: { description: "Set a figure with Stat and a heading with PageTitle instead of their type roles." },
    schema: [],
    messages: {
      figure:
        "`text-{{role}}` is the type of a kit figure or title. Set a figure with <StatValue size=…> (and its " +
        "<StatLabel>), a page heading with <PageTitle size=…>, so the pair of label and figure is built once.",
    },
  },
  create(context) {
    if (inKit(context.filename)) return {};
    const check = (node) => {
      for (const s of classStrings(node)) {
        const match = FIGURE_TYPE.exec(s);
        if (match) {
          context.report({ node, messageId: "figure", data: { role: match[1] } });
          return;
        }
      }
    };
    return {
      "JSXAttribute[name.name='className'] > JSXExpressionContainer"(node) {
        check(node.expression);
      },
      "JSXAttribute[name.name='className'] > Literal": check,
    };
  },
};

/** Kit controls sized by their `size` variant. */
const SIZED = new Set(["Button", "DropdownMenuTrigger", "ToggleGroupItem"]);
/** Classes that size a control: its height, box, corners and padding. */
const SIZE_CLASS = /(?:^|[\s:])(h|size|rounded|p|px|py|pl|pr|pt|pb)-[\w.]+/;

const noButtonSizeOverride = {
  meta: {
    type: "problem",
    docs: { description: "Size a kit control with its `size` variant, not classes." },
    schema: [],
    messages: {
      size:
        "`{{cls}}` resizes <{{name}}> by hand. Use one of its sizes (`toolbar`, `icon-sm`, `lg`, …) or add one " +
        "to its variants, so every control of that size matches.",
    },
  },
  create(context) {
    if (inKit(context.filename)) return {};
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || !SIZED.has(node.name.name)) return;
        const value = classNameOf(node);
        if (!value) return;
        for (const s of classStrings(value)) {
          const match = SIZE_CLASS.exec(s);
          if (match) {
            context.report({ node, messageId: "size", data: { cls: match[0].trim(), name: node.name.name } });
            return;
          }
        }
      },
    };
  },
};

const noHandmadeRadio = {
  meta: {
    type: "problem",
    docs: { description: "Build a group of choices on the kit's toggle group, not raw elements with roles." },
    schema: [],
    messages: {
      role:
        "role=\"{{role}}\" on a raw <{{tag}}> is a choice group built by hand, without the arrow keys and focus " +
        "handling. Use ToggleGroup, PickerMenu or a Base UI primitive, as TeePicker does.",
    },
  },
  create(context) {
    return {
      "JSXAttribute[name.name='role']"(node) {
        const role = node.value?.type === "Literal" ? node.value.value : null;
        if (!["radio", "radiogroup", "tab", "tablist", "menuitemradio"].includes(role)) return;
        const opening = node.parent;
        if (opening.name.type !== "JSXIdentifier" || !/^[a-z]/.test(opening.name.name)) return;
        context.report({ node, messageId: "role", data: { role, tag: opening.name.name } });
      },
    };
  },
};

/** The two files numbers and dates are worded in. */
const FORMAT_HOME = /[\\/]src[\\/]domain[\\/](format|date)\.ts$/;

const noFormatOutsideDomain = {
  meta: {
    type: "problem",
    docs: { description: "Word numbers and dates with domain/format.ts and domain/date.ts." },
    schema: [],
    messages: {
      format:
        "`{{call}}` formats a figure in place. Use (or add) a formatter in domain/format.ts or domain/date.ts, " +
        "so the same figure reads the same on every screen.",
    },
  },
  create(context) {
    if (FORMAT_HOME.test(context.filename)) return {};
    return {
      "CallExpression[callee.property.name=/^(toFixed|toLocaleString|toLocaleDateString|toLocaleTimeString)$/]"(node) {
        context.report({ node, messageId: "format", data: { call: `.${node.callee.property.name}()` } });
      },
      "NewExpression[callee.object.name='Intl']"(node) {
        context.report({ node, messageId: "format", data: { call: `Intl.${node.callee.property.name}` } });
      },
    };
  },
};

const noToParTone = {
  meta: {
    type: "problem",
    docs: { description: "Colour a to-par figure with ToParFigure, not toParTextClass() in a page." },
    schema: [],
    messages: {
      tone:
        "{{call}}() in a page paints a to-par figure by hand. Use <ToParFigure toPar={…} />: `size=\"inherit\"` " +
        "takes the type around it, and `label` words it (a tenth, \"1.2 strokes behind\"), so every to-par " +
        "reads and colours one way.",
    },
  },
  create(context) {
    if (inKit(context.filename)) return {};
    return {
      "CallExpression[callee.name=/^toPar(Stat)?TextClass$/]"(node) {
        context.report({ node, messageId: "tone", data: { call: node.callee.name } });
      },
    };
  },
};

const noRawTable = {
  meta: {
    type: "problem",
    docs: { description: "Build a page's table on the kit, not a raw <table>." },
    schema: [],
    messages: {
      table:
        "A raw <table> in a page rebuilds the kit's grid, and the two drift. A scorecard is ScorecardGrid " +
        "with its rows passed in (on ScorecardCard); anything else tabular belongs in the kit first.",
    },
  },
  create(context) {
    if (inKit(context.filename)) return {};
    return {
      "JSXOpeningElement[name.name='table']"(node) {
        context.report({ node, messageId: "table" });
      },
    };
  },
};

/** The file the chart hover card is built in. */
const isChartTooltip = (filename) => /[\\/]brand[\\/]charts[\\/]ChartTooltip\.tsx$/.test(filename);

const noHandmadeChartTooltip = {
  meta: {
    type: "problem",
    docs: { description: "Build a chart's hover card with ChartTooltip, not its classes by hand." },
    schema: [],
    messages: {
      tooltip:
        "A frosted card that ignores the pointer is a chart's hover card built by hand. Use <ChartTooltip id at>, " +
        "so every chart's card looks, flips and fades one way.",
    },
  },
  create(context) {
    if (isChartTooltip(context.filename)) return {};
    return {
      "JSXAttribute[name.name='className']"(node) {
        const source = context.sourceCode.getText(node.value ?? node);
        if (source.includes("bg-card/glass") && source.includes("pointer-events-none")) {
          context.report({ node, messageId: "tooltip" });
        }
      },
    };
  },
};

export default {
  rules: {
    "no-raw-heading": noRawHeading,
    "no-figure-type": noFigureType,
    "no-button-size-override": noButtonSizeOverride,
    "no-handmade-radio": noHandmadeRadio,
    "no-format-outside-domain": noFormatOutsideDomain,
    "no-handmade-card": noHandmadeCard,
    "no-tone-override": noToneOverride,
    "no-handmade-to-par-pill": noHandmadeToParPill,
    "no-breakpoint-styling": noBreakpointStyling,
    "no-to-par-tone": noToParTone,
    "no-raw-table": noRawTable,
    "no-handmade-chart-tooltip": noHandmadeChartTooltip,
  },
};
