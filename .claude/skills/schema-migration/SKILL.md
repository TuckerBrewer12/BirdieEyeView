---
name: schema-migration
description: "Project-specific database schema change workflow for the Golf ScoreCard app. Use when a change adds, alters or drops a table, column, index or constraint in the courses or users schemas, writes a file in database/migrations/ or edits database/schema.sql, backfills or rewrites existing rows, or for the refactor's step 10 dead-schema drop (users.scorecard_scans, users.rounds.adjusted_gross_score and score_differential, idx_rounds_differential, migration 013's trigram indexes). Finds every user of the schema object, gives the user read-only SQL to check production before anything is dropped and waits for the results, writes the numbered migration, the schema.sql change and the reverse SQL, tests them on the disposable test database, and orders the migration against the code that depends on it. Never touches production."
---

# Schema Migration (Claude Code wrapper)

Read and follow `.codex/skills/schema-migration/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`; read that file before starting the phase. The matching wrapper in `.claude/skills/` only points back to it.
- Give the production check SQL in plain text and stop until the user pastes the results. Never run it, or anything else, against production yourself; the confirmation gates are unchanged.
- Use the session's scratchpad directory for schema dumps and other `<scratch>` files.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper, so both agents keep one workflow. `quick_validate.py` is not available; check the frontmatter by hand instead.
