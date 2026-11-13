(function () {
  "use strict";
  var L = window.EvalLib,
    app = document.getElementById("app");
  var suite = document.getElementById("suite"),
    exclude = document.getElementById("exclude");
  var index,
    generation = 0,
    cache = new Map(),
    selected = new Set();
  // Same pattern the publisher validates; the PR link follows the repository in the run's own URL.
  var RUN_URL =
    /^https:\/\/github\.com\/([A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100})\/actions\/runs\/[0-9]+$/;
  function repositoryFor(info) {
    var match = typeof info.run_url === "string" && RUN_URL.exec(info.run_url);
    return "https://github.com/" + (match ? match[1] : "TuckerBrewer12/BirdieEyeView");
  }
  var source;
  try {
    var requested = new URLSearchParams(location.search).get("data");
    source = new URL(
      requested ||
        "https://raw.githubusercontent.com/TuckerBrewer12/BirdieEyeView/eval-results/",
      location.href
    );
    if (!["http:", "https:"].includes(source.protocol))
      throw new Error("Use an HTTP or HTTPS data source.");
    if (!source.pathname.endsWith("/")) source.pathname += "/";
  } catch (error) {
    showError(error);
    return;
  }
  document.getElementById("source").textContent = "Data: " + source.href;
  if (source.pathname.endsWith("/sample-data/")) {
    document.getElementById("data-label").textContent = "Sample data · preview";
  }

  function el(tag, text, className) {
    var n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = String(text);
    if (className) n.className = className;
    return n;
  }
  function link(text, href, external) {
    var n = el("a", text);
    n.href = href;
    if (external) {
      n.target = "_blank";
      n.rel = "noopener noreferrer";
    }
    return n;
  }
  function route(kind, id, b) {
    return (
      "#/" +
      kind +
      "/" +
      encodeURIComponent(id) +
      (b ? "/" + encodeURIComponent(b) : "")
    );
  }
  function options() {
    return { excludeKnownGaps: exclude.checked };
  }
  function percent(n) {
    return n === null ? "—" : n.toFixed(1) + "%";
  }
  function date(s) {
    return new Date(s).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  function badge(text) {
    return el(
      "span",
      text,
      "badge " +
        ({ ERROR: "error", FAILED: "failed", "changed inputs": "changed" }[
          text
        ] || text.toLowerCase())
    );
  }
  function append(parent) {
    Array.prototype.slice.call(arguments, 1).forEach(function (n) {
      parent.append(n);
    });
    return parent;
  }
  function title(eyebrow, heading, description) {
    app.append(
      append(
        el("div", null, "page-heading"),
        el("div", eyebrow, "eyebrow"),
        el("h1", heading),
        el("p", description, "subtitle")
      )
    );
  }
  function panel(heading, note) {
    var n = el("section", null, "panel"),
      head = el("div", null, "panel-heading");
    append(head, el("h2", heading));
    if (note) head.append(el("p", note));
    n.append(head);
    app.append(n);
    return n;
  }
  function table(parent, headers) {
    var wrap = el("div", null, "table-wrap"),
      t = el("table"),
      head = el("thead"),
      row = el("tr");
    headers.forEach(function (h) {
      row.append(el("th", h));
    });
    head.append(row);
    var body = el("tbody");
    append(t, head, body);
    wrap.append(t);
    parent.append(wrap);
    return body;
  }
  function row(body, values) {
    var r = el("tr");
    values.forEach(function (value) {
      var cell = el("td");
      cell.append(
        value instanceof Node ? value : document.createTextNode(String(value))
      );
      r.append(cell);
    });
    body.append(r);
    return r;
  }
  function tiles(items) {
    var cards = el("div", null, "cards");
    items.forEach(function (item) {
      cards.append(
        append(
          el("div", null, "card"),
          el("div", item[0], "card-label"),
          el("div", item[1], "card-value"),
          el("div", item[2] || "", "card-note")
        )
      );
    });
    app.append(cards);
  }
  function showError(error) {
    app.replaceChildren(
      el("p", error.message || String(error), "notice error")
    );
  }
  async function fetchJSON(path, limit) {
    var response = await fetch(new URL(path, source), {
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok)
      throw new Error(
        response.status === 404
          ? "No published results found. Run a labeled evaluation, or open ?data=./sample-data/ to explore the sample history."
          : "Could not load results (HTTP " +
            response.status +
            "). Try Refresh."
      );
    var reader = response.body.getReader(),
      length = 0,
      chunks = [];
    try {
      while (true) {
        var part = await reader.read();
        if (part.done) break;
        length += part.value.length;
        if (length > limit) {
          await reader.cancel();
          throw new Error("The report exceeds the supported size.");
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    var bytes = new Uint8Array(length),
      offset = 0;
    chunks.forEach(function (chunk) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    });
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  }
  async function loadRun(id) {
    var entry = index.runs.find(function (e) {
      return e.run.id === id;
    });
    if (!entry)
      throw new Error(
        "This run is not in the published index. Refresh after publication, or choose All runs."
      );
    if (!cache.has(id))
      cache.set(
        id,
        fetchJSON(entry.file, 2 * 1024 * 1024)
          .then(function (r) {
            L.validateRun(r);
            if (
              JSON.stringify(r.run) !== JSON.stringify(entry.run) ||
              JSON.stringify(r.summary) !== JSON.stringify(entry.summary)
            ) {
              // Key ordering is not meaningful in JSON; compare canonical key/value pairs.
              var equal = function (a, b) {
                return (
                  Object.keys(a)
                    .sort()
                    .every(function (k) {
                      return typeof a[k] === "object" && a[k] !== null
                        ? equal(a[k], b[k])
                        : a[k] === b[k];
                    }) && Object.keys(a).length === Object.keys(b).length
                );
              };
              if (!equal(r.run, entry.run) || !equal(r.summary, entry.summary))
                throw new Error(
                  "Run and index disagree. Refresh to load a consistent snapshot."
                );
            }
            return r;
          })
          .catch(function (error) {
            cache.delete(id);
            throw error;
          })
      );
    return cache.get(id);
  }
  function svgNode(tag, attrs) {
    var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs || {}).forEach(function (pair) {
      n.setAttribute(pair[0], pair[1]);
    });
    return n;
  }
  function chart(parent, points) {
    if (!points.length) {
      parent.append(el("p", "No scored cells in this selection.", "empty"));
      return;
    }
    var width = window.matchMedia("(max-width:700px)").matches ? 360 : 900,
      right = width - 25;
    var svg = svgNode("svg", {
      viewBox: "0 0 " + width + " 190",
      class: "chart",
      role: "img",
      "aria-label": "Numeric cell accuracy over time",
    });
    var defs = svgNode("defs");
    var gradient = svgNode("linearGradient", {
      id: "accuracy-fill",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1",
    });
    gradient.append(
      svgNode("stop", {
        offset: "0%",
        "stop-color": "currentColor",
        "stop-opacity": "0.14",
      }),
      svgNode("stop", {
        offset: "100%",
        "stop-color": "currentColor",
        "stop-opacity": "0.01",
      })
    );
    defs.append(gradient);
    svg.append(defs);
    [0, 25, 50, 75, 100].forEach(function (n) {
      var y = 150 - n * 1.3;
      svg.append(
        svgNode("line", { x1: 40, x2: right, y1: y, y2: y, class: "grid-line" })
      );
      var label = svgNode("text", { x: 0, y: y + 4, class: "axis-label" });
      label.textContent = n + "%";
      svg.append(label);
    });
    var coordinates = points.map(function (point, i) {
      return {
        x:
          points.length === 1
            ? width / 2
            : 48 + (i * (right - 48)) / (points.length - 1),
        y: 150 - point.accuracy * 1.3,
        point: point,
      };
    });
    function drawSegment(segment) {
      if (segment.length > 1) {
        var firstX = segment[0].split(",")[0];
        var lastX = segment[segment.length - 1].split(",")[0];
        svg.append(
          svgNode("polygon", {
            points: firstX + ",150 " + segment.join(" ") + " " + lastX + ",150",
            fill: "url(#accuracy-fill)",
          })
        );
      }
      svg.append(
        svgNode("polyline", { points: segment.join(" "), class: "chart-line" })
      );
    }
    var segment = [];
    coordinates.forEach(function (c, i) {
      if (c.point.breakBefore && segment.length) {
        drawSegment(segment);
        segment = [];
      }
      segment.push(c.x + "," + c.y);
      if (i === coordinates.length - 1) drawSegment(segment);
    });
    coordinates.forEach(function (c) {
      var a = svgNode("a", {
        href: route("run", c.point.id),
        "aria-label": c.point.label,
      });
      var dot = svgNode("circle", {
        cx: c.x,
        cy: c.y,
        r: 5,
        class: "chart-point",
      });
      var hint = svgNode("title");
      hint.textContent = c.point.label;
      dot.append(hint);
      a.append(dot);
      svg.append(a);
    });
    [coordinates[0], coordinates[coordinates.length - 1]].forEach(function (
      c,
      i
    ) {
      var label = svgNode("text", {
        x: i ? right : 40,
        y: 181,
        "text-anchor": i ? "end" : "start",
        class: "axis-label",
      });
      label.textContent = c.point.date;
      svg.append(label);
    });
    parent.append(svg);
  }
  function details(caseData, image) {
    var box = el("div", null, "detail-box");
    if (caseData.known_gap)
      box.append(el("p", "Known gap: " + caseData.known_gap, "warning"));
    if (caseData.operational_error)
      box.append(el("p", caseData.operational_error, "warning"));
    box.append(el("h3", "Mismatches"));
    var mismatchList = el("ul");
    caseData.mismatches.forEach(function (m) {
      mismatchList.append(
        el(
          "li",
          m.field +
            " · hole " +
            m.hole +
            " · expected " +
            m.expected +
            " · got " +
            (m.actual === null ? "unknown" : m.actual)
        )
      );
    });
    box.append(
      caseData.mismatches.length
        ? mismatchList
        : el(
            "p",
            caseData.status === "ERROR"
              ? "Extraction did not complete; no cell-level comparison is available."
              : "No mismatches.",
            "muted"
          )
    );
    box.append(el("h3", "Diagnostics"));
    var lines = [].concat(image ? image.diagnostics : [], caseData.diagnostics),
      list = el("ul");
    lines.forEach(function (line) {
      list.append(el("li", line));
    });
    box.append(
      lines.length ? list : el("p", "No diagnostics recorded.", "muted")
    );
    box.append(link("View case history", route("case", caseData.id)));
    return box;
  }
  function runOverview(entries) {
    title(
      "Scan pipeline",
      "Evaluation results",
      "Compare eval runs, inspect extraction failures, and track accuracy regressions by case."
    );
    if (!entries.length) {
      app.append(
        el(
          "p",
          "No runs match this suite. Choose another suite or publish an evaluation.",
          "notice"
        )
      );
      return;
    }
    entries = entries.slice().sort(function (a, b) {
      return Date.parse(b.run.created_at) - Date.parse(a.run.created_at);
    });
    var latest = entries[0],
      s = L.summaryFor(latest, options());
    tiles([
      [
        "Latest accuracy",
        percent(L.accuracy(latest, options())),
        s.matched_cells + " / " + s.total_cells + " numeric cells",
      ],
      [
        "Cases at 90%+",
        s.at_least_90 + " / " + s.cases,
        exclude.checked ? "Known gaps excluded" : "Known gaps included",
      ],
      ["Operational errors", s.operational_errors, "Latest evaluation"],
      ["Saved runs", entries.length, "Matching suite filter"],
    ]);
    chart(
      panel("Accuracy over time", "Whole-suite results · case sets may differ"),
      entries
        .slice()
        .reverse()
        .map(function (e) {
          return {
            id: e.run.id,
            accuracy: L.accuracy(e, options()),
            date: new Date(e.run.created_at).toLocaleDateString(),
            label:
              date(e.run.created_at) +
              " · " +
              percent(L.accuracy(e, options())),
          };
        })
        .filter(function (p) {
          return p.accuracy !== null;
        })
    );
    var section = panel(
        "Run history",
        "Choose two runs to compare compatible cases"
      ),
      action = el("button", "Compare selected", "compare-action");
    function updateButton() {
      action.disabled = selected.size !== 2;
    }
    updateButton();
    action.addEventListener("click", function () {
      var ids = Array.from(selected).sort(function (a, b) {
        return (
          Date.parse(
            index.runs.find(function (e) {
              return e.run.id === a;
            }).run.created_at
          ) -
          Date.parse(
            index.runs.find(function (e) {
              return e.run.id === b;
            }).run.created_at
          )
        );
      });
      location.hash = route("compare", ids[0], ids[1]);
    });
    section.firstChild.append(action);
    var body = table(section, [
      "",
      "Run",
      "Branch / commit",
      "Models",
      "Cells",
      "90%+",
      "Errors",
      "Merge rejected",
    ]);
    entries.forEach(function (entry) {
      var info = entry.run,
        sum = L.summaryFor(entry, options());
      var checkbox = el("input");
      checkbox.type = "checkbox";
      checkbox.checked = selected.has(info.id);
      checkbox.setAttribute("aria-label", "Compare run " + info.id);
      checkbox.addEventListener("change", function () {
        if (checkbox.checked) selected.add(info.id);
        else selected.delete(info.id);
        updateButton();
      });
      var runCell = append(
        el("div", null, "stack"),
        link(date(info.created_at), route("run", info.id)),
        el("span", info.suite + " · " + info.id, "muted")
      );
      var branch = append(
        el("div", null, "stack"),
        el("span", info.branch || "Local run"),
        el("span", info.commit ? info.commit.slice(0, 8) : "No commit", "muted")
      );
      if (info.dirty)
        branch.append(el("span", "Uncommitted changes", "warning"));
      if (info.pr)
        branch.append(
          link("PR #" + info.pr, repositoryFor(info) + "/pull/" + info.pr, true)
        );
      row(body, [
        checkbox,
        runCell,
        branch,
        el("span", info.models.ocr + " / " + info.models.merge, "muted"),
        el(
          "span",
          percent(L.accuracy(entry, options())) +
            " · " +
            sum.matched_cells +
            "/" +
            sum.total_cells,
          "number"
        ),
        sum.at_least_90 + "/" + sum.cases,
        sum.operational_errors,
        sum.merge_rejected_images,
      ]);
    });
  }
  function runDetail(run) {
    var info = run.run,
      s = L.summaryFor(run, options());
    title(
      info.suite + " evaluation",
      info.branch || "Local evaluation",
      date(info.created_at) + " · " + info.id
    );
    var meta = el("div", null, "run-meta");
    append(
      meta,
      el("span", "Tested: " + (info.commit || "unknown")),
      el("span", "OCR: " + info.models.ocr),
      el("span", "Merge: " + info.models.merge)
    );
    if (info.head_commit && info.head_commit !== info.commit)
      meta.append(el("span", "PR head: " + info.head_commit));
    if (
      typeof info.run_url === "string" &&
      RUN_URL.test(info.run_url)
    )
      meta.append(link("Actions report ↗", info.run_url, true));
    if (info.pr)
      meta.append(
        link("PR #" + info.pr + " ↗", repositoryFor(info) + "/pull/" + info.pr, true)
      );
    app.append(meta);
    if (info.dirty)
      app.append(
        el(
          "p",
          "This local run used uncommitted source changes; the commit alone does not identify the tested code.",
          "warning"
        )
      );
    tiles([
      [
        "Cell accuracy",
        percent(L.accuracy(run, options())),
        s.matched_cells + "/" + s.total_cells + " cells",
      ],
      ["Cases at 90%+", s.at_least_90 + "/" + s.cases, "Cumulative threshold"],
      ["Errors", s.operational_errors, "Operational failures"],
      [
        "Suite duration",
        run.summary.suite_seconds.toFixed(1) + "s",
        "Includes all images, even when filtering",
      ],
    ]);
    var images = table(
      panel("Images & OCR", "OCR is shared between players on the same card"),
      ["Image", "OCR + merge", "Diagnostics"]
    );
    run.images.forEach(function (image) {
      var d = el("details");
      d.append(el("summary", image.diagnostics.length + " entries"));
      var list = el("ul", null, "small-list");
      image.diagnostics.forEach(function (line) {
        list.append(el("li", line));
      });
      d.append(list);
      row(images, [image.image, image.ocr_seconds.toFixed(2) + "s", d]);
    });
    var cases = table(
      panel("Case results", "Errors and low-accuracy cases first"),
      ["Case", "Status", "Cells", "Accuracy", "Effective time", "Details"]
    );
    L.sortCases(
      run.cases.filter(function (c) {
        return !exclude.checked || !c.known_gap;
      })
    ).forEach(function (c) {
      var d = el("details");
      d.append(el("summary", "Inspect"));
      d.append(
        details(
          c,
          run.images.find(function (im) {
            return im.image === c.image;
          })
        )
      );
      row(cases, [
        link(c.id, route("case", c.id)),
        badge(c.status),
        c.matched_cells + "/" + c.total_cells,
        percent(L.accuracy(c)),
        c.effective_seconds.toFixed(2) + "s",
        d,
      ]);
    });
  }
  function compare(a, b) {
    var comparison = L.compareRuns(a, b, options());
    title(
      "Run comparison",
      "What changed?",
      "A: " +
        a.run.id +
        " → B: " +
        b.run.id +
        ". Deltas below use only cases with identical inputs, hints and answer keys."
    );
    var n = comparison.deltas;
    var signed = function (v) {
      return v > 0 ? "+" + v : String(v);
    };
    tiles([
      [
        "Matched cells Δ",
        signed(n.matched_cells),
        comparison.comparable + " comparable cases",
      ],
      ["Cases at 90%+ Δ", signed(n.at_least_90)],
      ["Errors Δ", signed(n.operational_errors), "Negative is better"],
      [
        "Merge rejections Δ",
        signed(n.merge_rejected_images),
        "Comparable images only",
      ],
    ]);
    var body = table(
      panel(
        "Per-case changes",
        "Changed inputs are not scored as improvements or regressions"
      ),
      ["Case", "A", "B", "Accuracy change", "Diagnostics"]
    );
    comparison.rows.forEach(function (r) {
      var d = el("details");
      d.append(el("summary", "Side by side"));
      var pair = el("div", null, "split");
      [a, b].forEach(function (run, i) {
        var c = i ? r.b : r.a;
        pair.append(
          append(
            el("div"),
            el("h3", i ? "Run B" : "Run A"),
            details(
              c,
              run.images.find(function (im) {
                return im.image === c.image;
              })
            )
          )
        );
      });
      d.append(pair);
      row(body, [
        link(r.id, route("case", r.id)),
        append(
          el("div", null, "stack"),
          badge(r.a.status),
          el("span", percent(L.accuracy(r.a)))
        ),
        append(
          el("div", null, "stack"),
          badge(r.b.status),
          el("span", percent(L.accuracy(r.b)))
        ),
        append(
          el("div", null, "stack"),
          badge(r.change),
          el(
            "span",
            r.delta === null
              ? "Answer key, image or hints differ"
              : signed(Number(r.delta.toFixed(2))) + " percentage points",
            "muted"
          )
        ),
        d,
      ]);
    });
    [
      ["Only in A", comparison.onlyInA],
      ["Only in B", comparison.onlyInB],
    ].forEach(function (part) {
      var section = panel(part[0], "Not included in comparison deltas");
      if (!part[1].length) section.append(el("p", "None", "muted"));
      part[1].forEach(function (c) {
        section.append(
          append(
            el("p"),
            link(c.id, route("case", c.id)),
            document.createTextNode(" · " + c.status)
          )
        );
      });
    });
  }
  function history(runs, id) {
    var entries = L.caseHistory(runs, id).filter(function (e) {
      return !exclude.checked || !e.case.known_gap;
    });
    entries.forEach(function (entry, i) {
      entry.changedInputs =
        i > 0 && entries[i - 1].case.fingerprint !== entry.case.fingerprint;
    });
    title(
      "Case history",
      id,
      "Track the same player and scorecard across runs. Chart segments break when the case inputs change."
    );
    if (!entries.length) {
      app.append(
        el(
          "p",
          "This case has no results in the selected suite/filter.",
          "notice"
        )
      );
      return;
    }
    chart(
      panel("Case accuracy"),
      entries.map(function (e) {
        return {
          id: e.run.id,
          accuracy: L.accuracy(e.case),
          breakBefore: e.changedInputs,
          date: new Date(e.run.created_at).toLocaleDateString(),
          label: e.run.id + " · " + percent(L.accuracy(e.case)),
        };
      })
    );
    var body = table(panel("Timeline"), [
      "Run",
      "Status",
      "Cells",
      "Accuracy",
      "Inputs",
    ]);
    entries
      .slice()
      .reverse()
      .forEach(function (e) {
        row(body, [
          append(
            el("div", null, "stack"),
            link(date(e.run.created_at), route("run", e.run.id)),
            el("span", e.run.id, "muted")
          ),
          badge(e.case.status),
          e.case.matched_cells + "/" + e.case.total_cells,
          percent(L.accuracy(e.case)),
          e.changedInputs ? badge("changed inputs") : "Same input version",
        ]);
      });
    var last = entries[entries.length - 1],
      run = runs.find(function (r) {
        return r.run.id === last.run.id;
      });
    panel("Latest diagnostics").append(
      details(
        last.case,
        run.images.find(function (im) {
          return im.image === last.case.image;
        })
      )
    );
  }
  async function render() {
    var current = ++generation;
    app.replaceChildren(el("p", "Loading reports…", "notice"));
    try {
      if (!index)
        index = L.validateIndex(
          await fetchJSON("index.json", 20 * 1024 * 1024)
        );
      if (current !== generation) return;
      var parts = location.hash
          .replace(/^#\/?/, "")
          .split("/")
          .map(decodeURIComponent),
        entries = L.filterRuns(index, { suite: suite.value });
      if (!parts[0]) {
        app.replaceChildren();
        runOverview(entries);
      } else if (parts[0] === "run" && parts.length === 2) {
        var run = await loadRun(parts[1]);
        if (current !== generation) return;
        app.replaceChildren();
        runDetail(run);
      } else if (parts[0] === "compare" && parts.length === 3) {
        if (parts[1] === parts[2])
          throw new Error("Select two different runs to compare.");
        var pair = await Promise.all([loadRun(parts[1]), loadRun(parts[2])]);
        if (current !== generation) return;
        app.replaceChildren();
        compare(pair[0], pair[1]);
      } else if (parts[0] === "case" && parts.length === 2) {
        var runs = [];
        // Bound concurrent requests rather than fetching the entire history in parallel.
        for (var i = 0; i < entries.length; i += 6) {
          runs.push.apply(
            runs,
            await Promise.all(
              entries.slice(i, i + 6).map(function (e) {
                return loadRun(e.run.id);
              })
            )
          );
          if (current !== generation) return;
        }
        app.replaceChildren();
        history(runs, parts[1]);
      } else throw new Error("Unknown report route. Choose All runs.");
    } catch (error) {
      if (current === generation) showError(error);
    }
  }
  suite.addEventListener("change", function () {
    selected.clear();
    render();
  });
  exclude.addEventListener("change", render);
  document.getElementById("refresh").addEventListener("click", function () {
    index = null;
    cache.clear();
    selected.clear();
    render();
  });
  window.addEventListener("hashchange", render);
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });
  render();
})();
