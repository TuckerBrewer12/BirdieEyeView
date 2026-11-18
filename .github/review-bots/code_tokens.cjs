const fs = require("node:fs");
const ts = require(process.env.TYPESCRIPT_MODULE || "typescript");

const KINDS = {
  ".ts": ts.ScriptKind.TS,
  ".tsx": ts.ScriptKind.TSX,
  ".js": ts.ScriptKind.JSX,
  ".jsx": ts.ScriptKind.JSX,
  ".mjs": ts.ScriptKind.JS,
  ".cjs": ts.ScriptKind.JS,
};

function codeTokens(path, text) {
  const ext = path.slice(path.lastIndexOf("."));
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, KINDS[ext]);
  if (source.parseDiagnostics.length > 0) return null;
  const tokens = [];
  const walk = (node) => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return;
    if (ts.isJsxExpression(node) && !node.expression) return;
    if (node.kind === ts.SyntaxKind.JsxText) {
      const words = node.text.trim().replace(/\s+/g, " ");
      if (words) tokens.push(`text:${words}`);
      return;
    }
    const children = node.getChildren(source);
    if (children.length === 0) {
      tokens.push(`${node.kind}:${node.getText(source)}`);
      return;
    }
    children.forEach(walk);
  };
  walk(source);
  return tokens;
}

const pairs = JSON.parse(fs.readFileSync(0, "utf8"));
const results = pairs.map(({ path, before, after }) => {
  const old = codeTokens(path, before);
  const now = codeTokens(path, after);
  if (old === null) return { path, same: false, reason: "the original does not parse" };
  if (now === null) return { path, same: false, reason: "the edit does not parse" };
  const same = old.length === now.length && old.every((token, i) => token === now[i]);
  return { path, same, reason: same ? "" : "code changed, not only comments" };
});
process.stdout.write(JSON.stringify(results));
