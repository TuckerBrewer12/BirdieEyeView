/**
 * Lint rules for Playwright screenshot specs and page robots.
 *
 * A page's look is pinned by `*.screenshot.spec.ts`: a robot drives the page into a state, waits
 * until that state is on screen, then `capture()` takes a full-page shot. Reviews kept catching the
 * same two slips: a capture with no wait before it (the shot lands mid-animation and flakes), and a
 * robot whose `capture()` shoots one element instead of the page (so the rest of the page can
 * change without failing anything). These rules catch both as you type.
 *
 * Wiring: capture-after-sees is for `src/pages/**\/*.screenshot.spec.ts`; full-page-capture is
 * for `src/pages/**\/*.robot.ts` (the kit's BrandKit robot shoots its preview stage on purpose).
 */

const WAIT_METHOD = /^(?:sees|doesNotSee)/;

/** The statement list a node sits in, and the statement that holds it. */
function enclosingStatement(node) {
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    if (Array.isArray(parent.body) && parent.body.includes(current)) return { list: parent.body, statement: current };
    if (parent.type === "SwitchCase" && parent.consequent.includes(current)) {
      return { list: parent.consequent, statement: current };
    }
    current = parent;
  }
  return null;
}

/** `await robot.method(...)` as `{ object, method }`, or null for anything else. */
function awaitedRobotCall(statement) {
  if (statement?.type !== "ExpressionStatement") return null;
  const awaited = statement.expression;
  if (awaited.type !== "AwaitExpression") return null;
  const call = awaited.argument;
  if (call.type !== "CallExpression" || call.callee.type !== "MemberExpression") return null;
  if (call.callee.computed || call.callee.property.type !== "Identifier") return null;
  return { object: call.callee.object, method: call.callee.property.name };
}

const captureAfterSees = {
  meta: {
    type: "problem",
    docs: { description: "A screenshot spec's capture() must come straight after a sees…/doesNotSee… wait." },
    schema: [],
    messages: {
      noWait:
        "`{{robot}}.capture()` has no visible-state wait before it. Wait for the state you're capturing " +
        "(`await {{robot}}.seesX()`) on the line before, so the shot isn't taken mid-animation.",
    },
  },
  create(context) {
    const source = context.sourceCode;
    return {
      "AwaitExpression > CallExpression.argument[callee.type='MemberExpression'][callee.property.name='capture']"(call) {
        if (call.callee.computed) return;
        const robot = source.getText(call.callee.object);
        const found = enclosingStatement(call);
        const index = found ? found.list.indexOf(found.statement) : -1;
        const previous = awaitedRobotCall(index > 0 ? found.list[index - 1] : null);
        const waited =
          previous !== null && WAIT_METHOD.test(previous.method) && source.getText(previous.object) === robot;
        if (!waited) context.report({ node: call, messageId: "noWait", data: { robot } });
      },
    };
  },
};

/** The `expect(...)` call at the root of `expect(x).not.toHaveScreenshot`, if there is one. */
function expectCall(node) {
  let current = node;
  while (current) {
    if (current.type === "CallExpression") {
      const callee = current.callee;
      if (callee.type === "Identifier" && callee.name === "expect") return current;
      if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "expect") {
        return current;
      }
      current = callee.type === "MemberExpression" ? callee.object : null;
    } else if (current.type === "MemberExpression") {
      current = current.object;
    } else {
      return null;
    }
  }
  return null;
}

function isPage(node) {
  if (!node) return false;
  if (node.type === "Identifier") return node.name === "page";
  return (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object.type === "ThisExpression" &&
    node.property.type === "Identifier" &&
    node.property.name === "page"
  );
}

const fullPageCapture = {
  meta: {
    type: "problem",
    docs: { description: "A page robot screenshots the page, never one element." },
    schema: [],
    messages: {
      element:
        "`{{target}}` is an element shot. Page screenshots use capture()'s full-page shot " +
        "(`expect(this.page).toHaveScreenshot(name, { fullPage: true })`); element shots belong to kit previews.",
    },
  },
  create(context) {
    return {
      "CallExpression[callee.type='MemberExpression'][callee.property.name='toHaveScreenshot']"(call) {
        const root = expectCall(call.callee.object);
        if (!root) return;
        const target = root.arguments[0];
        if (isPage(target)) return;
        const text = target ? context.sourceCode.getText(target) : "expect()";
        context.report({ node: call, messageId: "element", data: { target: text } });
      },
    };
  },
};

export default {
  meta: { name: "specs" },
  rules: {
    "capture-after-sees": captureAfterSees,
    "full-page-capture": fullPageCapture,
  },
};
