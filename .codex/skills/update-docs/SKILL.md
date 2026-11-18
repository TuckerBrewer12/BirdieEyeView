---
name: update-docs
description: Project-specific documentation skill for the Golf ScoreCard app. Use after make-code-change implements a backend change, or when the user asks to bring the docs/ guides up to date with code changes, to update the affected architecture, backend domain, practices, and operations guides, plus CLAUDE.md and AGENTS.md, without touching application code.
---

# Update Docs

## Purpose

Keep the `docs/` guides and the agent guides (`CLAUDE.md`, `AGENTS.md`) accurate after backend behavior, responsibilities, contracts, or source file locations change. Edit documentation only; do not modify application or test code.

## Inputs

1. Read `docs/practices/documentation.md`. It defines where each kind of information belongs, the suggested guide outline, and what stays out of documentation. Follow it over anything here.
2. Read `docs/README.md` for the guide index.
3. Find the changed source:
   - Within `$make-code-change`: use the implementation artifact's `### Docs To Update`, its plan amendments, and the implementation's changed files.
   - Standalone: diff against the branch this work will merge into, not `main` by default (`git diff --name-only $(git merge-base HEAD origin/<base>)` plus `git status --short`). Ask the user for the base when the branch's upstream or pull request does not show it, and confirm the scope if it is unclear.

## Steps

1. Map each changed source area to its guide using the table in `docs/practices/documentation.md`: `docs/architecture.md` for cross-domain flow, `docs/backend/<domain>.md` for a domain, `docs/practices/` for agreed conventions, and the operational guide (such as `docs/failed-scan-reports.md`) for setup and operations.
2. For each affected guide, read the guide and the changed source together. Update only what the change made inaccurate: responsibilities, important files and their links, data flow, contracts, and known integration limits. When the change closes a gap a guide describes (a dependency removed, a limitation fixed), search the guides for that statement as well as for the changed names: wording like "still imports API request types" does not mention the file it describes.
3. Keep implemented behavior separate from proposals. A local branch is not production, and a review finding is not a fix; say which one a statement describes.
4. Link to the owner of a rule instead of copying its values, and do not paste source code into prose.
5. Check that every repository-relative link in the edited guides resolves to an existing file or heading.
6. Do not edit guides under `docs/frontend/` or frontend practice guides; the frontend owner maintains them. If the change appears to affect one, list it in the final response instead.
7. Keep local review notes, planning drafts, handoff files, and `.codex/change-artifacts/` out of `docs/` unless the user explicitly asks to include them.
8. Update the `CLAUDE.md` bullets that describe the changed files, then make the same edit in `AGENTS.md`: the two must stay identical below their headers (`tests/test_agent_docs.py` checks it; run that test).
9. If `handoff.md` exists, update the status of the work this change completes or defers. It is an untracked local note: edit it, and never stage it.

Documentation-only edits need accurate links and source references. Apart from `tests/test_agent_docs.py`, they do not require running tests, paid providers, or database resets.

## Final Response

Finish with:

- guides updated (including `CLAUDE.md`/`AGENTS.md` and `handoff.md`), with a one-line summary of each change
- guides checked and left unchanged
- frontend guides that may need the frontend owner's attention
- link check result and the `tests/test_agent_docs.py` result

Do not commit.

## Continuous Skill Improvement

At the end of every invocation, check whether this docs run exposed a reusable gap in this skill. Typical evidence:

- An affected guide was missed, or a change was put in the wrong guide.
- The mapping from source area to guide was wrong or incomplete.
- The inputs above did not identify the changed source reliably.

When the evidence is concrete, follow the rules under Continuous Skill Improvement in `.codex/skills/make-code-change/SKILL.md`: the smallest correction, kept separate from the user's task and listed under "Skill changes", with no weakened gates. Prefer fixing `docs/practices/documentation.md` when the gap is in the documentation rules themselves, and say so. If no reusable gap appeared, leave the skill unchanged.
