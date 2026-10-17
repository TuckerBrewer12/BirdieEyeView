# Documentation practices

## Where information belongs

| Information | Location |
|---|---|
| How the whole app connects | `docs/architecture.md` |
| Domain responsibility and key files | `docs/backend/<domain>.md` |
| Frontend infrastructure and UI | `docs/frontend/` |
| Page purpose, state/data flow, and boundaries | `docs/frontend/pages/<page>.md` |
| Agreed conventions and explicitly marked refactor direction | `docs/practices/` |
| Bugs, evidence, unresolved product rules | A tracked issue or an explicitly approved design document; local review notes stay local. |
| Live operations/setup details | Relevant operational guide, such as `docs/failed-scan-reports.md`. |

Keep current explanations separate from review evidence. A review finding is not an implemented fix; a local branch is not production. Mark proposed or unconfirmed patterns explicitly. When a refactor lands, update the source links and describe the new responsibility rather than preserving an obsolete walkthrough.

## Suggested domain/page outline

1. Purpose and boundaries.
2. Important source files, with repository-relative links.
3. Main request/data/state flow in plain language.
4. Important contracts and known integration limits.
5. Relevant validation and links to detailed decisions.

A small page may need only a few paragraphs. Do not create a line-by-line inventory or copy source implementations into prose. Link to the owner of a shared rule instead of duplicating its exact values in many guides.

## Maintaining a change

Update the guide when routes, ownership, data flow, or public behavior changes. Keep the index current when adding a page/domain. Check local links, filenames, and command definitions against the checkout. Document useful test scenarios separately from claims that tests already exist or passed.

Keep local review notes, planning drafts, and handoff files out of documentation commits unless their inclusion is explicitly requested. Do not stage untracked Markdown files merely because a new guide references them; remove that dependency or use an approved repository source instead. Preserve the original local files when narrowing a documentation change.

Record an approved substantial decision with its date, context, chosen rule, affected layers, and remaining migration work in an explicitly shared design document or tracked issue. Avoid inventing a second competing decision log for the same rule. Never include private environment values or real tokens in examples.
