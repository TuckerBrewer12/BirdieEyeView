# BirdieEyeView
[birdie-eye-view.com
](https://www.birdie-eye-view.com/)

Photograph a physical scorecard. A Mistral OCR + Gemini LLM pipeline extracts scores, putts, GIR, and tee boxes into a complete digital round — with course and player analytics across all your rounds.

## Documentation

Start with the [documentation index](docs/README.md) for [backend domain guides](docs/backend/README.md), [frontend page guides](docs/frontend/README.md), and [coding practices](docs/practices/README.md). These distinguish current behavior from refactor work still awaiting integration.

---

## What It Does

**Scan** — Take a picture of any physical scorecard after your round. The app uses an LLM to pull out your scores, course info, hole pars, and shot stats automatically. Review the extraction and fix anything before saving.

**Track** — Every round is stored with hole-by-hole detail: strokes, putts, fairways, greens in regulation. The scorecard view shows your score against par for each hole and your front/back/total.

**Analyze** — The analytics dashboard breaks down your game across all your rounds:
- Score type distribution (eagles through quad bogeys)
- GIR and putting averages
- Scoring by hole distance and par type
- Worst and best holes
- Handicap trend over time

**Improve** — Set a scoring goal (break 90, 85, 80, etc.) and the app identifies your highest-ROI improvement areas: three-putt bleed, blowup holes, weak yardage zones, GIR opportunities, and more. Each insight is ranked by how many strokes it's worth.

---

## Running the App

Two terminals.

**Terminal 1 — Backend**
```bash
source .venv/bin/activate
uvicorn api.main:app --reload
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Backend runs on port 8000; the frontend proxies to it automatically.

Copy `.env.example` to `.env` and fill required keys (`GOOGLE_API_KEY`, `MISTRAL_API_KEY`, `SECRET_KEY`, `DATABASE_URL`).  
For auth emails in production, also set `RESEND_API_KEY` and `AUTH_FROM_EMAIL`.

## Scan Evaluation

Run the live scan evaluator locally from the repository root.

```bash
source .venv/bin/activate
python -m scripts.quick_scan_eval                # quick suite
python -m scripts.quick_scan_eval --suite large  # larger suite
```

Both commands require `MISTRAL_API_KEY` and `GOOGLE_API_KEY`. The evaluator uses the app's OCR-prefetch and extraction flow and shares one OCR result across all target players on an image. The [quick manifest](tests/test_scorecards/quick_eval_cases.json) contains four cases across three images. The [large manifest](tests/test_scorecards/scan_eval_cases.json) contains 22 active cases across 14 images. Move an entry from `disabled_cases` back into `cases` to re-enable it. Each case's `user_context` holds only hints the app or parser understands. Remarks for people go in an optional `notes` field, which the scanner never sees. A layout the scanner doesn't support yet carries a `known_gap` explanation and is reported as a known gap, for example the two Lake Chabot cases, whose card has no final score row.

The answer key grades final numeric values by field and hole number. To-par handwriting is compared against normalized raw strokes. Cards with recorded putts and shots-to-green grade those fields too. Results are cumulative: a 100% case also counts in the 90%+ and 80%+ totals. Cases below 80% are labeled failed and list every mismatch, but accuracy failures do not make the command exit unsuccessfully.

The report includes OCR/merge time per image, extraction and effective time per case, and total suite time, plus how many images had the Gemini table merge rejected. Under each case it lists the scan's internal diagnostics: what the OCR clean-up changed, whether the merge was accepted or why it was rejected, and each parser decision or refusal (which row was taken as the player, how the back nine was paired, why a name was not found). Provider latency and Gemini output vary across runs; the deterministic regression gate is the Mistral-capture scenario in `tests/integration/test_api_e2e.py`.

### Run from a pull request

In GitHub, create the two labels below if they are missing and configure `MISTRAL_API_KEY` and `GOOGLE_API_KEY` as repository Actions secrets. On a mergeable PR from a branch in the same repository, add one label to start the matching suite.

| PR label | Suite |
|---|---|
| `run-scan-evals` | Large |
| `run-quick-scan-eval` | Quick |

The [live eval workflow](.github/workflows/scan-evals.yml) evaluates the PR merge commit and posts accuracy, timing, a **Readable report** link to the Actions Summary, and the run ID on the PR. The raw text remains a downloadable artifact. A separate publishing job validates the structured report and appends it to the public `eval-results` branch. If the structured report can't be produced or is rejected, the eval still passes or fails on its own results and only that run is missing from the dashboard; a publishing failure does not block the PR comment. The check is optional for merging. Remove and re-add the label to request a new run after a push. A new request on the same PR supersedes a paid run already in progress.

### Dashboard and saved results

Open the static dashboard locally; no npm install or app server is needed:

```bash
cd eval-dashboard
python3 -m http.server 8080
```

Visit [http://localhost:8080/](http://localhost:8080/). It reads published history from the public `eval-results` branch. Add `?data=./sample-data/` to explore three illustrative runs without contacting providers. The dashboard includes suite filters, known-gap exclusion, case diagnostics/history, and two-run comparisons. Comparisons flag changed fixtures, hints, or answer keys instead of calling those scanner improvements. The data URL is shown in the footer; GitHub's raw-content cache may delay new results.

For a local live run, optionally export the same report formats:

```bash
python -m scripts.quick_scan_eval --suite large --results-json outputs/results.json --summary-markdown outputs/summary.md
```

Only public eval-fixture results belong on `eval-results`; never publish private user scans, photos, or raw OCR there. These changes do not use Railway storage or require GitHub Pages. See [dashboard setup, schema, and manual publication](eval-dashboard/README.md). Enabling optional Pages hosting later does not change the data source.

For production hardening (HTTPS, secret handling, DB network restrictions, security logging), see:

- `SECURITY_DEPLOYMENT.md`

## Secret Safety Checks

Run this before pushing:

```bash

bash scripts/security/scan_secrets.sh
```

This fails if common key/token formats are committed, if frontend code references secret env vars, or if frontend tries to call AI providers directly.
