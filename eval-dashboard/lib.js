/* Pure report calculations. No network or DOM access. */
(function (root) {
  "use strict";
  function requireValue(condition, message) {
    if (!condition) throw new Error(message);
  }
  function ratio(matched, total) {
    return total ? (matched * 100) / total : null;
  }
  function summary(cases, images, seconds) {
    var used = new Set(
      cases.map(function (c) {
        return c.image;
      })
    );
    var selectedImages = (images || []).filter(function (im) {
      return used.has(im.image);
    });
    function meets(c, n) {
      return (
        c.status !== "ERROR" &&
        c.total_cells > 0 &&
        c.matched_cells * 100 >= c.total_cells * n
      );
    }
    return {
      images: selectedImages.length,
      cases: cases.length,
      matched_cells: cases.reduce(function (n, c) {
        return n + c.matched_cells;
      }, 0),
      total_cells: cases.reduce(function (n, c) {
        return n + c.total_cells;
      }, 0),
      perfect: cases.filter(function (c) {
        return meets(c, 100);
      }).length,
      at_least_90: cases.filter(function (c) {
        return meets(c, 90);
      }).length,
      at_least_80: cases.filter(function (c) {
        return meets(c, 80);
      }).length,
      failed: cases.filter(function (c) {
        return !meets(c, 80);
      }).length,
      operational_errors: cases.filter(function (c) {
        return c.status === "ERROR";
      }).length,
      known_gaps: cases.filter(function (c) {
        return !!c.known_gap;
      }).length,
      merge_rejected_images: selectedImages.filter(function (im) {
        return im.diagnostics.some(function (line) {
          return (
            line.includes("table merge rejected") ||
            line.includes("table merge failed")
          );
        });
      }).length,
      suite_seconds: seconds || 0,
    };
  }
  function summaryFor(run, options) {
    if (!(options || {}).excludeKnownGaps) return run.summary;
    if (run.without_known_gaps) return run.without_known_gaps;
    return summary(
      run.cases.filter(function (c) {
        return !c.known_gap;
      }),
      run.images,
      run.summary.suite_seconds
    );
  }
  function accuracy(value, options) {
    if (Array.isArray(value)) {
      var cases = (options || {}).excludeKnownGaps
        ? value.filter(function (c) {
            return !c.known_gap;
          })
        : value;
      value = summary(cases);
    } else if (value.summary) value = summaryFor(value, options);
    return ratio(value.matched_cells, value.total_cells);
  }
  function compareRuns(a, b, options) {
    var exclude = (options || {}).excludeKnownGaps;
    var ac = a.cases.filter(function (c) {
      return !exclude || !c.known_gap;
    });
    var bc = b.cases.filter(function (c) {
      return !exclude || !c.known_gap;
    });
    var am = new Map(
      ac.map(function (c) {
        return [c.id, c];
      })
    );
    var bm = new Map(
      bc.map(function (c) {
        return [c.id, c];
      })
    );
    var rows = [];
    am.forEach(function (x, id) {
      if (!bm.has(id)) return;
      var y = bm.get(id),
        changed = x.fingerprint !== y.fingerprint;
      var delta = changed ? null : accuracy(y) - accuracy(x);
      rows.push({
        id: id,
        a: x,
        b: y,
        delta: delta,
        change: changed
          ? "changed inputs"
          : delta > 0
          ? "improved"
          : delta < 0
          ? "regressed"
          : "same",
      });
    });
    var compatible = rows.filter(function (r) {
      return r.change !== "changed inputs";
    });
    var as = summary(
      compatible.map(function (r) {
        return r.a;
      }),
      a.images,
      0
    );
    var bs = summary(
      compatible.map(function (r) {
        return r.b;
      }),
      b.images,
      0
    );
    var deltas = {};
    [
      "matched_cells",
      "at_least_90",
      "operational_errors",
      "merge_rejected_images",
    ].forEach(function (key) {
      deltas[key] = bs[key] - as[key];
    });
    return {
      rows: rows,
      deltas: deltas,
      comparable: compatible.length,
      onlyInA: ac.filter(function (c) {
        return !bm.has(c.id);
      }),
      onlyInB: bc.filter(function (c) {
        return !am.has(c.id);
      }),
    };
  }
  function caseHistory(runs, id) {
    var entries = [];
    runs.forEach(function (run) {
      var item = run.cases.find(function (c) {
        return c.id === id;
      });
      if (item) entries.push({ run: run.run, case: item });
    });
    entries.sort(function (a, b) {
      return (
        Date.parse(a.run.created_at) - Date.parse(b.run.created_at) ||
        a.run.id.localeCompare(b.run.id)
      );
    });
    return entries.map(function (entry, i) {
      return Object.assign({}, entry, {
        changedInputs:
          i > 0 && entries[i - 1].case.fingerprint !== entry.case.fingerprint,
      });
    });
  }
  function sortCases(cases) {
    var rank = { ERROR: 0, FAILED: 1, "80%+": 2, "90%+": 3, PERFECT: 4 };
    return cases.slice().sort(function (a, b) {
      return (
        rank[a.status] - rank[b.status] ||
        accuracy(a) - accuracy(b) ||
        a.id.localeCompare(b.id)
      );
    });
  }
  function filterRuns(index, options) {
    return index.runs.filter(function (entry) {
      return !options.suite || entry.run.suite === options.suite;
    });
  }
  function validSummary(s) {
    requireValue(
      s &&
        [
          "cases",
          "matched_cells",
          "total_cells",
          "at_least_90",
          "operational_errors",
          "known_gaps",
          "merge_rejected_images",
          "suite_seconds",
        ].every(function (key) {
          return (
            typeof s[key] === "number" && Number.isFinite(s[key]) && s[key] >= 0
          );
        }) &&
        s.matched_cells <= s.total_cells &&
        s.at_least_90 <= s.cases &&
        s.operational_errors <= s.cases,
      "Invalid report totals"
    );
  }
  function validRunInfo(run) {
    requireValue(
      run &&
        typeof run.id === "string" &&
        /^[A-Za-z0-9._-]{1,64}$/.test(run.id) &&
        ["quick", "large"].includes(run.suite) &&
        Number.isFinite(Date.parse(run.created_at)) &&
        run.models &&
        typeof run.models.ocr === "string" &&
        typeof run.models.merge === "string" &&
        (run.dirty === null || typeof run.dirty === "boolean"),
      "Invalid run metadata"
    );
  }
  function validateIndex(index) {
    requireValue(
      index &&
        index.schema_version === 1 &&
        Array.isArray(index.runs) &&
        index.runs.length <= 10000,
      "Unsupported results index"
    );
    var ids = new Set();
    index.runs.forEach(function (entry) {
      validRunInfo(entry.run);
      validSummary(entry.summary);
      validSummary(entry.without_known_gaps);
      requireValue(
        typeof entry.file === "string" &&
          /^runs\/[0-9-]+-(quick|large)-[A-Za-z0-9._-]+\.json$/.test(
            entry.file
          ) &&
          !ids.has(entry.run.id),
        "Invalid or duplicate run in index"
      );
      ids.add(entry.run.id);
    });
    return index;
  }
  function validateRun(run) {
    requireValue(
      run &&
        run.schema_version === 1 &&
        Array.isArray(run.cases) &&
        run.cases.length <= 100 &&
        Array.isArray(run.images) &&
        run.images.length <= 100,
      "Unsupported run report"
    );
    validRunInfo(run.run);
    validSummary(run.summary);
    var ids = new Set();
    run.cases.forEach(function (c) {
      requireValue(
        c &&
          typeof c.id === "string" &&
          !ids.has(c.id) &&
          typeof c.fingerprint === "string" &&
          /^[0-9a-f]{64}$/.test(c.fingerprint) &&
          Array.isArray(c.mismatches) &&
          Array.isArray(c.diagnostics) &&
          ["ERROR", "FAILED", "80%+", "90%+", "PERFECT"].includes(c.status),
        "Invalid case report"
      );
      validSummary({
        cases: 1,
        matched_cells: c.matched_cells,
        total_cells: c.total_cells,
        at_least_90: 0,
        operational_errors: 0,
        known_gaps: 0,
        merge_rejected_images: 0,
        suite_seconds: 0,
      });
      ids.add(c.id);
    });
    var calculated = summary(run.cases, run.images, run.summary.suite_seconds);
    Object.keys(calculated).forEach(function (key) {
      requireValue(
        calculated[key] === run.summary[key],
        "Inconsistent report totals"
      );
    });
    return run;
  }
  var lib = {
    accuracy: accuracy,
    summaryFor: summaryFor,
    compareRuns: compareRuns,
    caseHistory: caseHistory,
    sortCases: sortCases,
    filterRuns: filterRuns,
    validateIndex: validateIndex,
    validateRun: validateRun,
    summary: summary,
  };
  if (typeof module !== "undefined") module.exports = lib;
  else root.EvalLib = lib;
})(typeof window !== "undefined" ? window : globalThis);
