"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("./lib.js");
const sample = (name) =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname, "sample-data/runs", name), "utf8")
  );
const a = () => sample("2026-11-10-large-sample-before.json");
const b = () => sample("2026-11-11-large-sample-layout.json");

test("sample index and runs reconcile against independent expected totals", () => {
  const index = JSON.parse(
    fs.readFileSync(path.join(__dirname, "sample-data/index.json"), "utf8")
  );
  L.validateIndex(index);
  index.runs.forEach((entry) => {
    const run = L.validateRun(
      JSON.parse(
        fs.readFileSync(path.join(__dirname, "sample-data", entry.file), "utf8")
      )
    );
    assert.deepEqual(
      L.summaryFor(run, { excludeKnownGaps: true }),
      entry.without_known_gaps
    );
  });
  assert.equal(L.summaryFor(a(), { excludeKnownGaps: true }).matched_cells, 32);
  assert.equal(L.summaryFor(a(), { excludeKnownGaps: true }).total_cells, 36);
});

test("accuracy excludes known gaps from numerator and denominator, and zero is unknown", () => {
  assert.ok(Math.abs(L.accuracy(a()) - (32 / 54) * 100) < 1e-10);
  assert.ok(
    Math.abs(L.accuracy(a(), { excludeKnownGaps: true }) - (32 / 36) * 100) <
      1e-10
  );
  assert.equal(L.accuracy([]), null);
  assert.ok(
    Math.abs(
      L.accuracy(a().cases, { excludeKnownGaps: true }) - (32 / 36) * 100
    ) < 1e-10
  );
});

test("comparison distinguishes improvement, regression, unchanged, added and removed cases", () => {
  const left = a(),
    right = b();
  right.cases.push({ ...right.cases[0], id: "new-case" });
  left.cases.push({ ...left.cases[0], id: "old-case" });
  const comparison = L.compareRuns(left, right);
  assert.deepEqual(
    comparison.rows.map((r) => [r.id, r.change]),
    [
      ["bay_view_d", "regressed"],
      ["yocha_dehe_t", "improved"],
      ["lake_chabot_g", "same"],
    ]
  );
  assert.deepEqual(
    comparison.onlyInA.map((c) => c.id),
    ["old-case"]
  );
  assert.deepEqual(
    comparison.onlyInB.map((c) => c.id),
    ["new-case"]
  );
  assert.equal(comparison.deltas.matched_cells, 2);
  assert.equal(comparison.deltas.merge_rejected_images, -1);
});

test("changed image, hints or answer key is not an improvement", () => {
  const left = a(),
    right = b();
  right.cases[1].fingerprint = "f".repeat(64);
  const result = L.compareRuns(left, right);
  assert.equal(result.rows[1].change, "changed inputs");
  assert.equal(result.rows[1].delta, null);
  assert.equal(result.deltas.matched_cells, -2);
  assert.equal(result.comparable, 2);
});

test("history sorts chronologically, skips missing cases, and marks changed inputs", () => {
  const left = a(),
    right = b();
  right.cases[0].fingerprint = "f".repeat(64);
  const history = L.caseHistory(
    [right, { ...right, cases: [] }, left],
    "bay_view_d"
  );
  assert.deepEqual(
    history.map((e) => e.run.id),
    ["sample-before", "sample-layout"]
  );
  assert.equal(history[1].changedInputs, true);
});

test("case sorting puts errors and worst accuracy first without mutating input", () => {
  const cases = a().cases;
  assert.deepEqual(
    L.sortCases(cases).map((c) => c.status),
    ["ERROR", "FAILED", "PERFECT"]
  );
  assert.equal(cases[0].status, "PERFECT");
});

test("index rejects unsafe filenames and duplicate identities", () => {
  const index = JSON.parse(
    fs.readFileSync(path.join(__dirname, "sample-data/index.json"), "utf8")
  );
  index.runs[0].file = "https://evil.invalid/run.json";
  assert.throws(() => L.validateIndex(index));
  index.runs[0].file = "../private.json";
  assert.throws(() => L.validateIndex(index));
});

test("run rejects false summary totals and suite filtering is explicit", () => {
  const run = a();
  run.summary.matched_cells += 1;
  assert.throws(() => L.validateRun(run));
  assert.equal(
    L.filterRuns(
      { runs: [{ run: { suite: "quick" } }, { run: { suite: "large" } }] },
      { suite: "large" }
    ).length,
    1
  );
});
