---
name: parser-eval
description: "Project-specific scan accuracy gate for the Golf ScoreCard app. Use before and after any change that can affect scan output in this repository (OCR, the Gemini table merge prompt, model or validator, parsing, extraction, assembly, scan normalization or confidence, the eval cases or Mistral captures), including refactors called behavior-preserving, and when the user asks to run the eval, run the scan evals, or whether scan accuracy changed. Compares every eval card per field against a baseline and blocks done when any card got worse. Paid Mistral/Gemini runs need the user's explicit go-ahead every time."
---

# Parser Eval

## Purpose

Scan accuracy is the product. Before and after a change that can move scan output, measure it on the eval cases, compare card by card and cell by cell, and do not call the change done while any card got worse. Free checks come first. Every paid run needs the user's go-ahead.

A refactor branch once scored 124/144 against 142/144 on its base: the merge validator rejected every merge (one card fell to 0/18) and a stricter par-cell rule blanked a hole. The total hid neither cause; the per-card diff and the stage did.

## When It Applies

Any change to:

- what OCR sees and how its tables are cleaned: `services/mistral_ocr_service.py`, `services/scan_ocr.py`, `services/scan_image.py`, `api/scan_uploads.py`
- the merge: `services/gemini_table_merger.py` (prompt, `GEMINI_MERGE_MODEL`, the merge validator)
- parsing and assembly: `services/mistral_scorecard_parser.py`, `services/scan_assembly.py`, `services/scan_normalization.py`, the extract path in `api/routers/scan.py`, model validation scanned values pass through in `models/`
- scan confidence or review notes, when the edit can also change a value (an invalid score becoming unknown)
- providers: `MISTRAL_OCR_MODEL`, the `mistralai` or `google-genai` version in `requirements.txt`
- the eval itself: `tests/test_scorecards/*_cases.json`, `tests/integration/fixtures/mistral/`, `FIXTURE_MINIMUMS` in `tests/integration/test_api_e2e.py`, grading in `scripts/quick_scan_eval.py`

Refactors of these files count, behavior-preserving or not.

The eval grades unknown-course scans only (`course_id=None`) and grades values, not confidence or notes. A change confined to known-course assembly or to confidence numbers is proven by its E2E and unit tests; say the eval cannot see it rather than running a paid one.

## What Exists

| Check | Cost | Covers | Per-case baseline |
|---|---|---|---|
| Scan unit tests | free | single rules | none |
| Capture replay (E2E) | free; needs `TEST_DATABASE_URL` | OCR clean-up, parser, assembly and router on committed Mistral captures (taken 2026-11-13) of all 26 cases; merge skipped | `FIXTURE_MINIMUMS`: matched cells per case, kept equal to the current scores |
| Quick live eval | paid: 3 Mistral OCR + 3 Gemini calls, about 25 s | the whole pipeline; 4 cases, 3 cards, 144 cells | a recorded run on `eval-results`, or a new run |
| Large live eval (`--suite large`) | paid: 14 Mistral OCR + 14 Gemini calls | 22 cases, 14 cards, 1,116 cells | the same |

- Grading is per cell: strokes, putts and shots to green for holes 1-18 against the manifest's answer key. A case scores matched/total cells; an operational error scores 0.
- `known_gap` marks a case the scanner can't read yet, with the reason (today `lake_chabot_g` and `lake_chabot_d`). `disabled_cases` in `scan_eval_cases.json` never run.
- Live runs are not repeatable: Mistral re-reads the photo, `mistral-ocr-latest` moves, Gemini merges vary. They also differ from the replay, which skips the merge. Compare replay with replay and live with live, on the same suite and the same models (`run.models`).
- A live run prints a text report. `--results-json` and `--summary-markdown` also write the structured run: commit, dirty flag, models, each case's `fingerprint` and `mismatches`, each image's merge diagnostics. Runs started by a PR label are also kept as Actions artifacts and on the `eval-results` branch (`index.json`, `runs/<date>-<suite>-<id>.json`).
- No tool compares two runs cell by cell. The dashboard (`eval-dashboard/`) compares per case by accuracy, so a case with one cell fixed and another broken shows as "same". Compare by hand (step 5).
- A live run can't save its raw Mistral or merged text: `LOG_SENSITIVE_OCR_DEBUG` logs at DEBUG, which the eval script does not print.

## Cost Rule

- Before each paid run, state the suite, the commit, the route (local or PR label), the provider calls (table above), and for the label route that it posts a PR comment and publishes the results to the public `eval-results` branch. Then ask, and wait for a yes.
- Approval covers one run. Plan approval, an earlier go-ahead, or a passing quick run does not approve the next one. Refreshing a Mistral capture is a paid run too.
- Route. With a pushed same-repository PR, prefer its label: `gh pr edit <n> --add-label run-quick-scan-eval` (quick) or `run-scan-evals` (large). CI tests the PR merged into its base with the project's Actions secrets and keeps the history. To rerun, remove and re-add the label; each add is a paid run. Without a PR, and for a base-branch baseline, run locally.
- Locally, from the checkout's root:

  ```bash
  .venv/bin/python -m scripts.quick_scan_eval --suite quick \
    --results-json <eval dir>/<label>.json --summary-markdown <eval dir>/<label>.md
  ```

  It reads `MISTRAL_API_KEY` and `GOOGLE_API_KEY` from that checkout's `.env`. In a worktree without one, use the main checkout's environment and keys without copying them: `<main>/.venv/bin/python -m dotenv -f <main>/.env run -- <main>/.venv/bin/python -m scripts.quick_scan_eval …`.

## Steps

### 1. Scope

Name the stages the change touches (step 6 lists them) and which checks can see each. Merge prompt, model and validator changes, and OCR provider changes, are invisible to the free checks; tell the user up front that they need a paid run. Start the eval note (see Eval Note).

### 2. Baseline

The base is the branch the change merges into (`backend-refactor` for a feature branch) at its current commit: `git fetch origin`, then `git rev-parse origin/<base>`.

- **Free:** run step 3 on the base before the first edit. When the capture replay passes there, `FIXTURE_MINIMUMS` is the per-case baseline. A case failing on the base is a known failure, not the change's; record it.
- **Live:** reuse a recorded run when it matches: `git fetch origin eval-results`, read `git show origin/eval-results:index.json`, and take the newest run of the same suite with `dirty` false, no operational errors, today's models (`MISTRAL_OCR_MODEL`, `GEMINI_MERGE_MODEL`), and no scan change since: `git diff --quiet <run.commit> origin/<base> -- api services models scripts/quick_scan_eval.py tests/test_scorecards requirements.txt`. If that commit is not available locally after `git fetch origin <sha>`, the run does not match.
- Otherwise a live baseline is a new paid run of the base (ask): `git worktree add --detach <scratch>/parser-eval-base origin/<base>`, run it there, then `git worktree remove <scratch>/parser-eval-base`. A worktree has no `.venv`: run the main checkout's `.venv/bin/python` from the worktree's root.
- Run a new live baseline and the after run close together; providers drift.
- Record suite, mode (replay or live), branch, commit SHA, date, source (recorded run id or local), models and each case's matched/total.

### 3. Free Checks

Before and after the change, every time:

```bash
.venv/bin/python -m pytest -q tests/test_mistral_ocr_service.py tests/test_mistral_scorecard_parser.py \
  tests/test_gemini_table_merger.py tests/test_scan_assembly.py tests/test_scan_normalization.py \
  tests/test_scan_router_helpers.py tests/test_quick_scan_eval.py tests/test_eval_results.py
.venv/bin/python -m pytest -q tests/integration/test_api_e2e.py -k "eval_case or mistral_captures or missing_name"
```

- The second command needs `TEST_DATABASE_URL` for a disposable database (`docs/practices/testing.md`). If it is not set, report that the free per-card gate did not run. Do not put a paid run in its place without asking.
- A case below its floor fails and prints its mismatched cells: a regression. A case above its floor: raise its value in `FIXTURE_MINIMUMS` as part of the change, or a later slide back to the old score would pass.
- Floors catch a lost cell, not a swap (one cell fixed, another broken, same count). For a parser or OCR clean-up change, also diff the stage dump (step 6) of every case between base and change, and check each changed row against the answer key.

### 4. Paid Checks

Only after step 3 passes, and only with a yes for each run (Cost Rule):

1. Quick suite. Recommend it before merging any change in scope; it is required evidence for merge and OCR provider changes.
2. Large suite, only when the quick suite shows no regression and the user agrees.

Save each run's JSON and Markdown in the eval note's folder. For a label run, take the JSON from `git show origin/eval-results:runs/<file>` or `gh run download <run-id> -n scan-eval-<suite>-results-<attempt>`.

### 5. Compare

Per case, then per cell. Never only the total:

- Pair cases by `id`. A case whose `fingerprint` differs had its inputs changed (photo, answer key, player, format or hints) and is not comparable; list it. A case in only one run: list it.
- In each run, key a case's `mismatches` by (`field`, `hole`). A key in the after run but not the baseline is a lost cell. A key only in the baseline is a fixed cell. A key in both with a different `actual` is a changed wrong value: list it. A new `operational_error` loses the whole case. In the text reports the same cells read `strokes hole 2: expected 4, got 5` under each case.
- Any lost cell makes its case a regression, even when the total rose.
- Known-gap cases are not regressions. List them with both scores, and list the disabled cases.
- Compare each image's merge lines (`table merge accepted`, `rejected: <rule>`, `failed`). A merge newly rejected or failed is a merge-stage change; report it even when no cell moved.

### 6. Diagnose By Stage

The stages: Mistral's response → cleaned tables (`MistralOCRService.extract_markdown_text`) → merged table (`merge_split_tables`, live only) → parsed rows (`parse_mistral_scorecard_rows`) → round (`assemble_scan` and the router) → graded cells.

For a regression the replay shows, dump the cleaned OCR and parsed rows from the captures on the base and on the change, and `diff` the two files. Name case ids to limit it; none dumps all cases. Run from the checkout's root, and for the base, in the temporary worktree from step 2:

```bash
.venv/bin/python - [case ids] > <eval dir>/stages-<label>.txt <<'EOF'
import json, sys
from pathlib import Path
from scripts.quick_scan_eval import SUITE_MANIFEST_PATHS, load_cases
from services.mistral_ocr_service import MistralOCRService
from services.mistral_scorecard_parser import parse_mistral_scorecard_rows
cases = [c for s in SUITE_MANIFEST_PATHS.values() for c in load_cases(s) if c.case_id in sys.argv[1:] or len(sys.argv) < 2]
for case in cases:
    notes = []
    capture = json.loads((Path("tests/integration/fixtures/mistral") / f"{Path(case.image).stem}.json").read_text())
    markdown = MistralOCRService.extract_markdown_text(capture, notes)
    rows = parse_mistral_scorecard_rows(markdown, user_context=case.user_context)
    print(f"=== {case.case_id}: cleaned OCR", markdown, *notes, f"=== {case.case_id}: parsed rows", sep="\n")
    print(*(f"{key}: {value}" for key, value in rows.model_dump(exclude={"markdown"}).items()), sep="\n")
EOF
```

- Cleaned OCR differs: the OCR clean-up. Same OCR, different parsed rows: the parser. Both the same but graded cells differ: assembly, normalization or the router.
- A regression only the live run shows: compare that image's merge lines in both runs. A flipped outcome points at the merge. The same outcome points at a different Mistral read or provider variance. The live run kept no raw text, so this cannot be proven; say so, and offer a repeat run (paid) rather than assuming variance.

### 7. Stop Rule

The change is done only when no case outside the known gaps lost a cell, and no new operational error appeared, in every check that ran. Otherwise stop and report (see Report) with the per-card diff and the stage, then ask the user to choose:

- **fix** the change and repeat steps 3 to 5;
- **accept** with a reason: record the reason and the user's words in the eval note, and the regression in the PR text. Lower a `FIXTURE_MINIMUMS` value only under such an acceptance;
- **revert** the change.

Never edit an answer key, add a `known_gap`, disable a case or lower a floor to make a check pass. A change to the eval cases is its own decision: the user checks any new or edited answer key against the photo.

## Eval Note

Keep the record in `.codex/change-artifacts/eval/<branch-slug>.md`, with run files in `.codex/change-artifacts/eval/<branch-slug>/`. Derive `<branch-slug>` as `$make-code-change` does. The folder is ignored by git; never commit it. Append the baseline, each run (mode, suite, commit, date, dirty flag, models, source, paid calls made), each comparison and each user decision. Do not rewrite earlier entries.

## Report

Regressions first:

```text
Scan eval: <replay | live quick | live large>
Baseline: <branch> <sha> <date> <source> <models>
After:    <branch> <sha> <date> <dirty?>
Total:    <matched>/<total> → <matched>/<total>

Regressions (block done)
- <case>: <before> → <after>/<total>; <field> hole <n>: <ok | was x> → <got>; stage: <stage> (<evidence>)
Changed merge outcomes
- <image>: <before> → <after>
Improvements
- <case>: <before> → <after>/<total>; fixed <field> hole <n>, …
Unchanged: <cases>
Known gaps (not counted): <case> <before> → <after>; disabled: <cases>
Not comparable: <cases and why>
Not run: <checks skipped and why>
Paid calls this session: <runs and calls>
```

End with the verdict (no regression, or blocked pending the user's choice) and the eval note's path.

## Continuous Skill Improvement

At the end of every invocation, check whether this run exposed a reusable gap in this skill. Typical evidence:

- A regression reached the user, a review or a later run that these steps should have caught.
- A command, path, case count or call count here was wrong.
- A paid run happened without its own go-ahead, or the user had to ask for the per-card diff.

When the evidence is concrete, follow the rules under Continuous Skill Improvement in `.codex/skills/make-code-change/SKILL.md`. If no reusable gap appeared, leave the skill unchanged.
