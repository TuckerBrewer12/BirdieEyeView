# BirdieEyeView
[birdie-eye-view.com
](https://www.birdie-eye-view.com/)

Photograph a physical scorecard. A Mistral OCR + Gemini LLM pipeline extracts scores, putts, GIR, and tee boxes into a complete digital round — with course and player analytics across all your rounds.

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

## Quick Scan Evaluation

Use the small live evaluation suite while iterating on the scorecard scanning algorithm:

```bash
source .venv/bin/activate
python -m scripts.quick_scan_eval
```

The command requires both `MISTRAL_API_KEY` and `GOOGLE_API_KEY`. It runs the three images in `tests/test_scorecards` through the same OCR-prefetch and extraction flow used by the app. The Half Moon Bay image is OCR-scanned once and evaluated for both players, for four cases total.

The answer key grades final numeric values by field and hole number. To-par handwriting is compared against normalized raw strokes. Cards with recorded putts and shots-to-green grade those fields too. Results are cumulative: a 100% case also counts in the 90%+ and 80%+ totals. Cases below 80% are labeled failed and list every mismatch, but accuracy failures do not make the command exit unsuccessfully.

The report includes OCR/merge time per image, extraction and effective time per case, and total suite time. Provider latency varies, so use timings as directional comparisons while iterating rather than controlled benchmarks. The live evaluation is opt-in and is not run by ordinary pytest or GitHub Actions.

For production hardening (HTTPS, secret handling, DB network restrictions, security logging), see:

- `SECURITY_DEPLOYMENT.md`

## Secret Safety Checks

Run this before pushing:

```bash

bash scripts/security/scan_secrets.sh
```

This fails if common key/token formats are committed, if frontend code references secret env vars, or if frontend tries to call AI providers directly.
