# Review bots

On every non-draft PR the Brand Kit and MVVM bots leave inline comments and
open a second PR that implements the finding, targeting the original PR's
branch. The Frontend coverage bot is separate: it posts one sticky comment
with Vitest changed-line coverage plus an AI count of reasonable screenshot
and espresso screens. It does not open fix PRs. UI Test Checker still flags
missing tests as review comments.

From a finding you can:

1. **Merge the fix PR** — it lands as one commit on the original branch.
2. **Discuss in Conductor** — every comment has a link that opens a Grok chat
   already seeded with the file and the finding.
3. **Reply `/fix`** — retry.

Fix PRs are labelled `skip-bots` and live on `bot-fix/pr-<n>/…` branches so
they do not re-trigger the review bots. GitHub does not run CI on PRs opened
with `GITHUB_TOKEN`; merging into the original branch will run CI there.

The fix bot gets the finding text and the repo — no extra recipe file. It
follows neighbouring code. Styling is Tailwind token classes
(`bg-primary`, `text-muted-foreground`), not `useTheme()`.

## Layout

| File | What it is |
| --- | --- |
| `brand-kit.md`, `mvvm.md`, `ui-test-checker.md` | Review prompts |
| `run-bot.sh` | Shared reviewer: diff → model → GitHub review |
| `post_review.py` | JSON findings → review payload + fixable list |
| `fix.md` + `run-fix.sh` | Apply one finding and open a PR |
| `links.py` | Discuss-in-Conductor (Grok) URLs |
| `frontend-coverage.md` + `run-coverage.sh` | Coverage reporter: Vitest % + AI screen counts → sticky comment |
| `coverage_report.py` | Changed-line %, test inventory, comment upsert |
