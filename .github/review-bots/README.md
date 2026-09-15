# Review bots

On every non-draft PR the Brand Kit and MVVM bots leave inline comments. When a
finding matches a [recipe](recipes/), they also open a second PR that
implements the change, targeting the original PR's branch.

From a finding you can:

1. **Merge the fix PR** — it lands as one commit on the original branch.
2. **Discuss in Conductor** — every comment has a link that opens a Grok chat
   already seeded with the file, the finding, and the recipe.
3. **Reply `/fix`** — retry, or attempt a fix on a finding that had no recipe.

Fix PRs are labelled `skip-bots` and live on `bot-fix/pr-<n>/…` branches so
they do not re-trigger the review bots. GitHub does not run CI on PRs opened
with `GITHUB_TOKEN`; the fix job already ran the recipe's `verify` command,
and merging into the original branch will run CI there.

## Layout

| File | What it is |
| --- | --- |
| `brand-kit.md`, `mvvm.md` | Review prompts |
| `run-bot.sh` | Shared reviewer: diff → model → GitHub review |
| `post_review.py` | JSON findings → review payload + fixable list |
| `recipes/` | One markdown file per mechanical fix, with a worked example |
| `fix.md` + `run-fix.sh` | Apply one finding, verify, open a PR |
| `links.py` | Discuss-in-Conductor (Grok) URLs |

## Adding a recipe

See [recipes/README.md](recipes/README.md). The catalog is injected into every
review prompt automatically — tagging a finding with the new id is enough.
