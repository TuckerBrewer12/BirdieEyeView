#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(FRONTEND, "src");
const SPEC_SUFFIX = { screenshot: ".screenshot.spec.ts", ui: ".ui.spec.ts" };
const FULL_SUITE_LABEL = "full-suite";

const WORKFLOWS_THAT_RUN_SPECS = [".github/workflows/screenshots.yml", ".github/workflows/tests.yml"];
const FRONTEND_FILES_THAT_RENDER_NOTHING = [
  /^eslint\//,
  /^android\//,
  /^ios\//,
  /\.md$/,
  /^openapi\.json$/,
  /^knip\.json$/,
  /^components\.json$/,
  /^nixpacks\.toml$/,
  /^railway\.json$/,
  /^server\.js$/,
  /^capacitor\.config\.ts$/,
  /^scripts\/gen-tokens\.mjs$/,
];

function srcPath(file) {
  return path.relative(SRC, file).split(path.sep).join("/");
}

function isPageComponent(file) {
  return /^pages\/.*Page\.tsx$/.test(file);
}

function isUnitTest(file) {
  const playwrightSpec = /\.(screenshot|ui|capture)\.spec\.ts$/.test(file);
  return (/\.(test|spec)\.tsx?$/.test(file) && !playwrightSpec) || /Test\.tsx?$/.test(file);
}

function isBarrel(sourceFile) {
  return (
    sourceFile.statements.length > 0 &&
    sourceFile.statements.every((statement) => ts.isExportDeclaration(statement) && statement.moduleSpecifier)
  );
}

export function buildGraph() {
  const configPath = path.join(FRONTEND, "tsconfig.app.json");
  const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, FRONTEND);
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  const checker = program.getTypeChecker();
  const imports = new Map();
  const barrels = new Set();
  const texts = new Map();

  const inSrc = (file) => file && path.resolve(file).startsWith(SRC + path.sep);

  function moduleFile(specifier, from) {
    const resolved = ts.resolveModuleName(specifier, from, parsed.options, ts.sys).resolvedModule?.resolvedFileName;
    if (resolved) return resolved;
    const base = specifier.startsWith("@/") ? path.join(SRC, specifier.slice(2)) : path.resolve(path.dirname(from), specifier);
    return specifier.startsWith(".") || specifier.startsWith("@/") ? base : undefined;
  }

  function declaringFiles(name) {
    let symbol = checker.getSymbolAtLocation(name);
    if (!symbol) return [];
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    return (symbol.declarations ?? []).map((declaration) => declaration.getSourceFile().fileName);
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (!inSrc(sourceFile.fileName)) continue;
    const from = sourceFile.fileName;
    const targets = new Set();
    const add = (files) => files.filter(inSrc).forEach((file) => targets.add(srcPath(file)));
    const addModule = (specifier) => add([moduleFile(specifier, from)].filter(Boolean));

    if (isBarrel(sourceFile)) barrels.add(srcPath(from));
    texts.set(srcPath(from), sourceFile.text);

    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const clause = statement.importClause;
        const specifier = statement.moduleSpecifier.text;
        if (!clause) addModule(specifier);
        else if (!clause.isTypeOnly) {
          if (clause.name) add(declaringFiles(clause.name));
          const bindings = clause.namedBindings;
          if (bindings && ts.isNamespaceImport(bindings)) addModule(specifier);
          if (bindings && ts.isNamedImports(bindings)) {
            for (const element of bindings.elements) {
              if (element.isTypeOnly) continue;
              const files = declaringFiles(element.name);
              if (files.some(inSrc)) add(files);
              else addModule(specifier);
            }
          }
        }
      }
      if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && !statement.isTypeOnly) {
        const specifier = statement.moduleSpecifier.text;
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) add(declaringFiles(element.propertyName ?? element.name));
        } else addModule(specifier);
      }
    }

    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        addModule(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    targets.delete(srcPath(from));
    imports.set(srcPath(from), targets);
  }

  return { imports, barrels, texts };
}

function reach(graph, entries, stopAt = () => false) {
  const parent = new Map(entries.map((entry) => [entry, null]));
  const queue = [...entries];
  while (queue.length) {
    const file = queue.shift();
    for (const next of graph.imports.get(file) ?? []) {
      if (parent.has(next) || stopAt(next)) continue;
      parent.set(next, file);
      queue.push(next);
    }
  }
  return parent;
}

function chain(parent, file) {
  const steps = [];
  for (let at = file; at; at = parent.get(at)) steps.unshift(at);
  return steps;
}

function previewStories(graph) {
  const stories = new Map();
  for (const file of graph.imports.keys()) {
    const match = /^(?:brand\/previews\/[^/]+|pages\/.+\/previews)\/([^/]+)\.tsx$/.exec(file);
    if (match) stories.set(match[1], file);
  }
  return stories;
}

function routePages(graph) {
  const pages = new Map();
  const files = [...graph.imports.keys()];
  for (const match of (graph.texts.get("App.tsx") ?? "").matchAll(/path="\/([a-z-]+)[^"]*"\s+element=\{<(\w+Page)\b/g)) {
    const file = files.find((candidate) => candidate.endsWith(`/${match[2]}.tsx`));
    if (file) pages.set(match[1], [...(pages.get(match[1]) ?? []), file]);
  }
  return pages;
}

const ROUTE_USES = [
  /goto\(\s*["'`]\/([a-z-]+)/g,
  /toHaveURL\(\s*["'`][^"'`]*?\/([a-z-]+)/g,
  /toHaveURL\(\s*\/(?:\^)?\\\/([a-z-]+)/g,
  /new RegExp\(\s*["'`]\^?\/([a-z-]+)/g,
];

function specEntries(graph, spec, stories, routes) {
  const testsDir = spec.slice(0, spec.lastIndexOf("/tests/"));
  const ownTests = [...reach(graph, [spec]).keys()].filter((file) => file.includes("/tests/") || file === spec);
  const text = ownTests.map((file) => graph.texts.get(file) ?? "").join("\n");
  const entries = new Set([spec]);

  for (const file of graph.imports.keys()) {
    if (isPageComponent(file) && path.posix.dirname(file) === testsDir) entries.add(file);
  }
  for (const [, literal] of text.matchAll(/["'`]([A-Za-z][A-Za-z0-9]*)["'`]/g)) {
    if (stories.has(literal)) entries.add(stories.get(literal));
  }
  for (const pattern of ROUTE_USES) {
    for (const [, segment] of text.matchAll(pattern)) (routes.get(segment) ?? []).forEach((file) => entries.add(file));
  }
  return [...entries];
}

function frontendRelative(repoPath) {
  return repoPath.startsWith("frontend/") ? repoPath.slice("frontend/".length) : undefined;
}

export function classifyChange(repoPath, { shell, barrels }) {
  if (WORKFLOWS_THAT_RUN_SPECS.includes(repoPath)) return { everything: "a workflow that runs the specs changed" };
  const inFrontend = frontendRelative(repoPath);
  if (inFrontend === undefined) return { nothing: true };
  if (!inFrontend.startsWith("src/")) {
    if (FRONTEND_FILES_THAT_RENDER_NOTHING.some((pattern) => pattern.test(inFrontend))) return { nothing: true };
    return { everything: "build, config or dependency input to every spec" };
  }
  const file = inFrontend.slice("src/".length);
  if (file.endsWith(".css")) return { everything: "global CSS" };
  if (file.startsWith("brand/theme/")) return { everything: "theme tokens every component reads" };
  if (barrels.has(file)) return { everything: "a barrel: it decides which file each import name means" };
  if (shell.has(file)) return { everything: `the app shell renders it on every page (${chain(shell, file).join(" → ")})` };
  if (isUnitTest(file)) return { nothing: true };
  const snapshot = /^(.*\.spec\.ts)-snapshots\/[^/]+\.png$/.exec(file);
  if (snapshot) return { file: snapshot[1] };
  return { file };
}

export function selectSpecs(graph, kind, changed) {
  const specs = [...graph.imports.keys()].filter((file) => file.endsWith(SPEC_SUFFIX[kind])).sort();
  const shell = reach(graph, ["main.tsx"], (file) => file.startsWith("pages/") || file === "brand/BrandHarness.tsx");
  const context = { shell, barrels: graph.barrels };

  const relevant = [];
  for (const repoPath of changed) {
    const change = classifyChange(repoPath, context);
    if (change.everything) return { mode: "all", specs, why: `\`${repoPath}\`: ${change.everything}` };
    if (change.file) relevant.push(change.file);
  }

  const stories = previewStories(graph);
  const routes = routePages(graph);
  const selected = [];
  const reached = new Set();
  for (const spec of specs) {
    const parent = reach(graph, specEntries(graph, spec, stories, routes));
    const reasons = relevant.filter((file) => parent.has(file)).map((file) => chain(parent, file));
    reasons.forEach((steps) => reached.add(steps.at(-1)));
    if (reasons.length) selected.push({ spec, reasons });
  }
  const unreached = relevant.filter((file) => !reached.has(file));
  return { mode: selected.length ? "some" : "none", specs: selected.map(({ spec }) => spec), selected, unreached, total: specs.length };
}

function changedFiles(base) {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const out = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { cwd: root, encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

async function fullSuiteLabel() {
  const { PR_NUMBER, GITHUB_REPOSITORY, GITHUB_TOKEN } = process.env;
  if (!PR_NUMBER || !GITHUB_REPOSITORY || !GITHUB_TOKEN) return false;
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/labels`, {
    headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`Reading the pull request's labels failed: ${response.status}`);
  return (await response.json()).some((label) => label.name === FULL_SUITE_LABEL);
}

const code = (file) => `\`${file}\``;

export function summary(kind, result) {
  const title = `### ${kind === "ui" ? "UI tests" : "Screenshot specs"} for this change`;
  if (result.mode === "all") return `${title}\n\nFull suite (${result.specs.length} spec files): ${result.why}.\n`;
  const lines = [title, ""];
  if (result.mode === "none") lines.push(`No spec renders a changed file, so none of the ${result.total} spec files run.`);
  else {
    lines.push(
      `Running ${result.specs.length} of ${result.total} spec files. Add the \`${FULL_SUITE_LABEL}\` label and re-run for all of them.`,
      "",
      "| Spec | Why |",
      "|---|---|",
    );
    for (const { spec, reasons } of result.selected) {
      const why = reasons.map((steps) => steps.map(code).join(" → ") + " changed").join("<br>");
      lines.push(`| ${code(spec)} | ${why} |`);
    }
  }
  if (result.unreached.length) lines.push("", `Changed, but no spec renders: ${result.unreached.map(code).join(", ")}`);
  return lines.join("\n") + "\n";
}

function option(name) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

async function main() {
  const kind = option("kind");
  if (!SPEC_SUFFIX[kind]) throw new Error("--kind must be screenshot or ui");
  const graph = buildGraph();
  const everything = [...graph.imports.keys()].filter((file) => file.endsWith(SPEC_SUFFIX[kind])).sort();

  let why = option("all");
  if (!why && process.env.SPEC_SELECTION === "off") why = "the SPEC_SELECTION repository variable is off";
  if (!why && (await fullSuiteLabel())) why = `the \`${FULL_SUITE_LABEL}\` label`;

  const changed = option("changed")?.split(",") ?? (option("base") ? changedFiles(option("base")) : undefined);
  if (!why && !changed) why = "no --base to compare against";

  const result = why ? { mode: "all", specs: everything, why } : selectSpecs(graph, kind, changed);
  const report = summary(kind, result);
  process.stdout.write(report);

  const summaryFile = option("summary");
  if (summaryFile) appendFileSync(summaryFile, report);
  const outputFile = option("github-output");
  if (outputFile) {
    const files = result.mode === "some" ? result.specs.map((spec) => `src/${spec}`).join(" ") : "";
    appendFileSync(outputFile, `mode=${result.mode}\nfiles=${files}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

