# Fix recipes

A recipe is the repo's written-down answer to a finding that keeps coming back.

Review bots see the catalog (id + `when`) and tag a finding with the id that
fixes it. The fix bot then opens a PR against the original branch, using this
file as the instructions. A human merges that PR to take the change as a
commit, or clicks **Discuss in Conductor** on the comment. Reply `/fix` on the
comment to retry.

The quality of the fix is almost entirely the quality of the recipe, so
recipes are written for a competent stranger: here is the trigger, here are
the steps, here is one real example from this repo, here is how you know
you're done.

Recipes live in this directory, one markdown file per id (`<id>.md`).

## Front matter

`key: value` lines, no nesting — parsed by `../recipes.py`, no YAML on the runner.

| Key | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Must equal the filename stem. What a bot puts in `"recipe"`. |
| `title` | yes | One line, shown on the PR the fix bot opens. |
| `when` | yes | The trigger, in one sentence. This is the whole basis a review bot has for picking this recipe — make it precise enough to be wrong about. |
| `setup` | no | Runner prep: `none` (default), `frontend` (`npm ci`), `frontend-playwright` (`npm ci` + Chromium). |
| `verify` | no | Shell command run from the repo root after the edit. Non-zero fails the fix and no PR is opened. |

## Body

Four sections, in this order:

1. **When this applies** — and, just as important, when it does not.
2. **The fix** — numbered steps, naming exact paths and naming conventions.
3. **Worked example** — real files from this repo, quoted in full. Not sketched,
   not elided. This is the part the model actually copies.
4. **Done when** — a checklist someone can tick off.

## Adding one

1. Write `recipes/<id>.md`.
2. Confirm it parses and lands in the catalog:
   `python3 .github/review-bots/recipes.py catalog`
3. If the finding is one an existing bot can already spot, nothing else is
   needed — the catalog is injected into every bot prompt automatically. If it
   is a new kind of finding, teach a bot to look for it in its prompt
   (`../brand-kit.md`, `../mvvm.md`).

Keep the set small. A recipe that fires twice a year is a document; a recipe
worth automating is one you have written the same review comment for three times.
