# Review bots

On every non-draft PR the Brand Kit, MVVM, and UI Test Checker bots leave
inline comments and open a second PR that implements the finding, targeting
the original PR's branch. The Frontend coverage bot is separate: it posts one
sticky comment with Vitest and Espresso changed-line coverage plus an AI
count of reasonable screenshot and espresso screens. It does not open fix PRs.

The No Comments Bot does not comment: it deletes. On every non-draft PR that
adds Python, TypeScript or JavaScript, it runs pstack's `no-comments` skill
(Comment Sicko's rules, in `no-comments.md`) over the lines the PR adds,
pushes one commit to the PR's branch (`Delete comments added in #<n>`), and
keeps one sticky comment listing what it deleted, the comments it kept and
why, and the code a deleted comment was excusing (reshape it so it needs no
comment). Revert the commit to bring any comment back. `comment_guard.py`
checks the edit before it is committed and reverts any file where the model
did more than delete comments the PR added: the code's syntax tree (Python)
or tokens (TypeScript, through `code_tokens.cjs`) must match, no tool
directive (`eslint-disable`, `noqa`, `@ts-expect-error`, …) may go, and
nothing outside the PR's added lines may change. A rejected file gets one
retry with the reason named, then is left alone and listed.

A push made with `GITHUB_TOKEN` does not start other workflows, so CI does not
rerun on the bot's commit. Add a `BOT_PUSH_TOKEN` secret (a fine-grained token
with contents write on this repo) and the bot pushes with it instead, which
reruns CI.

A later commit does not re-open the same finding. The bot that left the
comment rechecks it: ✅ if the latest commit fixed it, ❌ if it is still
there. New issues introduced by that commit are still reported and still
get a fix PR.

When the fix is a local line edit (swap a token class, a hex, a size), the
comment includes a GitHub **commit suggestion**. Accept it on the comment to
apply the change immediately. Findings that need new files or a view-model
API still open a fix PR.

From a finding you can:

1. **Commit the suggestion** on the comment — the fast path for token swaps
   and other one-line edits.
2. **Merge the fix PR** — for findings that need new files or a view-model
   change. It lands as one commit on the original branch.
3. **Discuss in Conductor** — every comment has a link that opens a Grok chat
   already seeded with the file and the finding.
4. **Reply `/fix`** — open (or retry) a fix PR.

Fix PRs are labelled `skip-bots` and live on `bot-fix/pr-<n>/…` branches so
they do not re-trigger the review bots. GitHub does not run CI on PRs opened
with `GITHUB_TOKEN`; merging into the original branch will run CI there.

The repo must allow Actions to open those PRs: **Settings → Actions →
General → Allow GitHub Actions to create and approve pull requests**. Without
that, the bot can push `bot-fix/…` branches but `gh pr create` is rejected,
and the review comment never gets a PR link. If create still fails, the bot
replies with a compare URL so the PR can be opened in one click.

The fix bot gets the finding text and the repo — no extra recipe file. It
follows neighbouring code. Styling is Tailwind token classes
(`bg-primary`, `text-muted-foreground`), not `useTheme()`.

Reviews and fixes run through the Cursor CLI as Grok 4.7 (`grok-4.7-high`).
The workflow secret is `CURSOR_API_KEY`. The model can read the repo. Shell
and network are denied, and a CLI failure fails the check instead of posting
nothing.

## Layout

| File | What it is |
| --- | --- |
| `brand-kit.md`, `mvvm.md`, `ui-test-checker.md` | Review prompts |
| `run-bot.sh` | Shared reviewer: diff → model → GitHub review |
| `cursor-run.sh` | Cursor CLI invocation shared by the review, coverage, and fix runners |
| `previous.py` | Match earlier comments, ✅/❌ recheck, skip duplicate fix PRs |
| `post_review.py` | JSON findings → review payload + fixable list |
| `fix.md` + `run-fix.sh` | Apply one finding and open a PR |
| `links.py` | Discuss-in-Conductor (Grok) URLs |
| `frontend-coverage.md` + `run-coverage.sh` | Coverage reporter: Vitest % + Espresso % + AI screen counts → sticky comment |
| `coverage_report.py` | Changed-line %, test inventory, comment upsert |
| `no-comments.md` + `run-no-comments.sh` | No Comments Bot: delete added comments, commit, sticky comment |
| `comment_guard.py` + `code_tokens.cjs` | Check the bot only deleted comments the PR added; revert the rest |
