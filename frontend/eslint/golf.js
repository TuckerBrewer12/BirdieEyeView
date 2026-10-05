/**
 * Lint rules for golf logic that has been copied into a view instead of coming from the one
 * place that owns it.
 *
 * The backend works out a round's figures (api/round_responses.py), `domain/` holds the
 * frontend's golf rules, and `brand/theme/` holds how a score is painted and worded. A view
 * that rebuilds any of these drifts from the original: a second label table, a second
 * "under par is green" branch, a second `strokes - par`.
 */

const SCORE_KEYS = new Set([
  "eagle", "birdie", "par", "bogey", "double", "triple", "quad",
  // Older spellings the legacy analytics types still use.
  "double_bogey", "triple_bogey", "quad_bogey", "double-bogey", "worse",
]);

/** A name that holds a score against par: toPar, to_par, holeToPar, diff. */
const TO_PAR_NAME = /(^|[a-z_])(to_?par|diff)$/i;
const STROKES_NAME = /^(strokes|score|totalScore|total_score|gross)$/i;
const PAR_NAME = /^(par|par_played|parPlayed|coursePar|course_par|holePar)$/i;

/** Golf types the domain and API already model. Declaring another type by one of these names shadows it. */
const GOLF_TYPE_NAMES = new Set([
  "Round", "HoleScore", "Hole", "Nine", "Course", "Tee", "ScoreCounts", "ScoreKind", "RoundCourse", "UserTee",
]);

function nameOf(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && !node.computed) return node.property.name;
  if (node.type === "ChainExpression") return nameOf(node.expression);
  if (node.type === "TSNonNullExpression") return nameOf(node.expression);
  return null;
}

function isNumber(node) {
  if (node.type === "Literal" && typeof node.value === "number") return true;
  return node.type === "UnaryExpression" && node.operator === "-" && isNumber(node.argument);
}

function propertyKey(prop) {
  if (prop.type !== "Property" || prop.computed) return null;
  if (prop.key.type === "Identifier") return prop.key.name;
  if (prop.key.type === "Literal") return String(prop.key.value);
  return null;
}

const noScoreKindTable = {
  meta: {
    type: "problem",
    docs: { description: "Keep tables keyed by score type in brand/theme/score.ts or domain/score.ts." },
    schema: [],
    messages: {
      table:
        "This object is keyed by score type ({{keys}}). Score-type tables live in one place: words and paint in " +
        "brand/theme/score.ts (scoreKindLabel, scoreFillClass, scoreOnFillClass, colors.score[kind]), rules in " +
        "domain/score.ts. Use or extend those instead of keeping a copy here.",
    },
  },
  create(context) {
    return {
      ObjectExpression(node) {
        const keys = node.properties.map(propertyKey).filter((key) => key && SCORE_KEYS.has(key));
        if (new Set(keys).size >= 4) {
          context.report({ node, messageId: "table", data: { keys: keys.slice(0, 4).join(", ") + ", …" } });
        }
      },
    };
  },
};

const noToParBranch = {
  meta: {
    type: "problem",
    docs: { description: "Read a score's kind, colour and label from the domain and theme, not by comparing to-par." },
    schema: [],
    messages: {
      branch:
        "`{{name}} {{op}} {{value}}` classifies a score against par. The server sends each hole's `kind`, " +
        "domain/score.ts has scoreKind, and brand/theme/score.ts has toParTextClass, toParTone, toParLabel and " +
        "scoreKindLabel. Use those so every view agrees on what under, even and over par look like.",
    },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        if (!["<", ">", "<=", ">=", "===", "!==", "==", "!="].includes(node.operator)) return;
        const [named, number] = isNumber(node.right) ? [node.left, node.right] : [node.right, node.left];
        if (!isNumber(number)) return;
        const name = nameOf(named);
        if (!name || !TO_PAR_NAME.test(name)) return;
        context.report({
          node,
          messageId: "branch",
          data: { name, op: node.operator, value: context.sourceCode.getText(number) },
        });
      },
    };
  },
};

const noGolfMath = {
  meta: {
    type: "problem",
    docs: { description: "Golf figures come from the server, or Round.previewEdits while editing." },
    schema: [],
    messages: {
      math:
        "`{{left}} - {{right}}` works out a score against par in a view. The backend sends to-par for every hole, " +
        "nine and round, and Round.previewEdits is the one frontend place that recomputes it while editing.",
    },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        if (node.operator !== "-") return;
        const left = nameOf(node.left);
        const right = nameOf(node.right);
        if (left && right && STROKES_NAME.test(left) && PAR_NAME.test(right)) {
          context.report({ node, messageId: "math", data: { left, right } });
        }
      },
    };
  },
};

const noShadowedGolfType = {
  meta: {
    type: "problem",
    docs: { description: "Import the domain's and API's golf types instead of declaring new ones by the same name." },
    schema: [],
    messages: {
      shape:
        "`{{name}}` is already a golf type: the model in domain/ or the API's in types/. Declaring another one " +
        "by the same name gives one concept two shapes. Import that type, and narrow it if you need to " +
        "(`HoleScore & { strokes: number }`).",
    },
  },
  create(context) {
    const check = (node, body) => {
      if (body && body.type !== "TSTypeLiteral" && body.type !== "TSInterfaceBody") return;
      if (GOLF_TYPE_NAMES.has(node.id.name)) {
        context.report({ node: node.id, messageId: "shape", data: { name: node.id.name } });
      }
    };
    return {
      TSInterfaceDeclaration: (node) => check(node, node.body),
      TSTypeAliasDeclaration: (node) => check(node, node.typeAnnotation),
    };
  },
};

export default {
  meta: { name: "golf" },
  rules: {
    "no-score-kind-table": noScoreKindTable,
    "no-to-par-branch": noToParBranch,
    "no-golf-math": noGolfMath,
    "no-shadowed-golf-type": noShadowedGolfType,
  },
};
