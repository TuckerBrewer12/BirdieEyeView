# Scan evaluation dashboard

A static viewer for public scorecard-evaluation history. It has no build step, npm dependencies, application backend, or Railway integration.

From this directory:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080/](http://localhost:8080/). The default data source is `https://raw.githubusercontent.com/TuckerBrewer12/BirdieEyeView/eval-results/`. The footer identifies the source. The viewer caps its index at 10,000 entries/20 MB and individual reports at 2 MB; older data remains stored even if a future archive exceeds viewer limits. Add `?data=./sample-data/` for three **illustrative** runs, or use another HTTP(S) directory with the same layout. Files must be served over HTTP; opening `index.html` as a local file is insufficient. A different origin must permit CORS. GitHub raw-content caching can delay newly published data; Refresh reloads the index.

## Reading results

- History defaults to the large suite; choose Quick or All suites explicitly. The chart shows whole-suite cell accuracy; changing case sets can change that aggregate independently of scanner quality.
- Exclude known gaps removes annotated cases from counts and the accuracy denominator. Zero remaining cells display as unknown. Suite duration still measures the full run.
- Run details include metadata, per-image OCR/merge diagnostics, per-case errors and cell mismatches. An operational error is retained in the denominator and displayed distinctly from a completed scan with wrong values.
- Compare two runs to see improvements, regressions, changed inputs, and cases present in only one run. Deltas use only cases with matching input fingerprints (photo bytes, answer key, player, score format and scan hints). Case-history charts break at input-version changes. Different case versions are preserved, not silently treated as model regressions.

## Data contract and persistence

The authority is the standard-library [validator/archive CLI](../scripts/eval_results.py). Version 1 run files contain `run`, `summary`, `images`, and `cases`, plus `schema_version`. Metadata records UTC time, branch, the **tested merge SHA**, PR-head SHA separately, a dirty-working-tree flag, provider model names, PR number and Actions URL. Local runs with uncommitted source changes are labelled; when Git metadata is unavailable it is recorded as unknown. Each case has a stable ID and an input fingerprint, status, matched/total cell counts, mismatches, diagnostics, optional known-gap reason and optional operational error. Source photos, answer keys and raw OCR are not embedded in the report; answers for mismatched cells appear in the mismatch details.

The `eval-results` branch contains:

```text
README.md
index.json
runs/YYYY-MM-DD-SUITE-RUN_ID.json
```

`index.json` is rebuilt from validated run files, newest first, and includes full and known-gap-filtered summaries. Reports are bounded to 2 MB, 100 cases/images, 200 diagnostics per case/image and 500 characters per string. Exported diagnostics are visibly truncated at those limits. IDs, dates, URLs, counts, statuses, duplicate identities and aggregate arithmetic are checked. Invalid data is rejected before writing; identical publication retries are idempotent, and a conflicting report for an existing run ID is rejected. An interrupted disk write can leave a complete run awaiting an index rebuild; re-adding the same report repairs the index.

Only publish results for the committed **public fixtures**. The reports are public and may include player initials or OCR-derived diagnostic labels from those fixtures. Provider keys are redacted before artifacts, Summary output and branch publication. Never put private failed-scan photos or user reports here.

The [label workflow](../.github/workflows/scan-evals.yml) exports JSON and readable Markdown, posts the PR report link, and publishes JSON in a separate job. The publishing job alone gets `contents: write`; it checks artifact metadata against the producer run and pushes only to `eval-results`. It uses the evaluated checkout's script, as approved for same-repository contributors, not a default-branch trusted-workflow boundary. No code from the JSON artifact or data branch is executed. Repository rules must allow `github-actions[bot]` to create/update `eval-results`; it is never force-pushed.

Publication is queued with GitHub's `queue: max` (up to 100 pending jobs) and retries non-fast-forward pushes. Queue overflow, cancelled evaluations, protected-branch rejection or exhausted retries can prevent automatic publication. Retain/download the structured artifact and retry the publishing job or add it manually. Re-running only publishing uses the original artifact ID/run ID, not a new evaluation attempt. Raw artifacts follow the repository's Actions retention settings; successful branch publications remain until explicitly removed. PR comments do not wait for publishing and therefore do not attest that history was saved.

## Local exports and optional manual publication

From the repository root, a **paid** local scan can write both formats:

```bash
python -m scripts.quick_scan_eval --suite large --results-json outputs/results.json --summary-markdown outputs/summary.md
```

Keep the generated `local-…` ID to avoid overwriting another run. To add an export to a deliberately prepared local checkout of the data branch:

```bash
python scripts/eval_results.py add --results outputs/results.json --repo-dir /path/to/eval-results-checkout
```

Review that checkout's changes before committing/pushing it. This command does not push. The separate `publish` subcommand is used by CI; it requires a **new** destination directory and a remote, appends using ordinary Git commits/pushes, and never changes your source checkout.

Optional GitHub Pages or another static host can later serve this directory without a build. Pages setup/deployment is not included here; the absolute data URL works regardless of where the HTML is served.

## Deterministic validation

From the repository root:

```bash
node --test eval-dashboard/*.test.js
.venv/bin/python -m pytest -q tests/test_quick_scan_eval.py tests/test_eval_results.py
```

These use sample data, provider replacements and disposable local Git repositories; they do not call paid providers or publish to GitHub.
