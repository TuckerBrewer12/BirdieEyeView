---
name: skill-retro
description: "Project-specific retrospective skill for the Golf ScoreCard app. Use at the end of a piece of work or a pull request, after the user corrects the agent in this repository, or when the user asks for a retro, \"what should we change in the skills\", or to \"update the skill after this\". Turns each correction or miss into the smallest durable fix in the right place (a check, AGENTS.md and CLAUDE.md, a workflow skill, or the agent's memory) and proposes the list for approval before applying anything."
---

# Skill Retro

## Purpose

Turn what went wrong in a session into fixes that stop it happening again. Each correction or miss gets the smallest durable fix in the place that owns it, or an explicit "no fix". Propose first; change nothing until the user approves.

## Relation To Continuous Skill Improvement

Each phase skill ends with a Continuous Skill Improvement check that follows the rules in `.codex/skills/make-code-change/SKILL.md`. That check is the in-flow trigger: it fixes one phase's own skill as soon as the evidence is concrete. This skill is the deliberate pass after the work, across the whole session:

- It covers misses outside any phase (PR text, commits, tool behavior, work done without `$make-code-change`) and homes other than a skill.
- It proposes, then applies on the skill branch, instead of editing during the task.
- Skill changes the in-flow check already made this session are inputs: confirm, sharpen or revert them; do not make them twice.

The rules in that section still apply here: smallest correction, no rules for application bugs or one-offs, no weakened gates, no duplicated rules.

## Steps

### 1. Collect

List every correction and miss from the session:

- what the user had to ask for or point out; quote them
- claims that turned out wrong (a finding, a "done", a test that could not fail)
- rework: a fix after review, a reverted edit, a repeated attempt
- misses you caught yourself late
- fixes already made this session: the in-flow "Skill changes" and any memory entries written

Look at the conversation, the artifacts' `### Plan Amendments`, review comments (`gh pr view <n> --comments`), and fix-up commits on the branch. One line each. Do not drop an item because it looks small or embarrassing.

### 2. Diagnose

For each item, name the phase or rule that should have prevented it, and which case it is:

- **missing**: no rule covers it;
- **vague**: a rule exists but allowed the miss (read it and say which words let it through);
- **ignored**: a rule exists and is clear. Don't restate it. Ask why it was not applied: it sits in the wrong place (scoped to one phase while the miss happened elsewhere), it is buried, or nothing checks it. The fix is sharper placement or a check;
- **one-off**: it will not recur, or it was handled correctly (an honest Plan Amendment is the workflow working);
- **already fixed**: a fix landed this session. Name where, and check it against Route and Propose instead of fixing it again.

Search the skills, `AGENTS.md` and memory for the topic before calling a rule missing.

### 3. Route

Pick the first home on this list that can hold the fix:

1. **A tool can enforce it** → `.gitignore`, a test under `tests/`, a `scripts/ci/check_*.py` check, or a hook. A check beats a sentence the agent has to remember. Tests and checks are code: they get their own commit and their own test run, apart from skill text.
2. **A fact about the repo or its tools**, true for any task → `AGENTS.md`, with the same edit in `CLAUDE.md`. The two stay identical below their first three lines; run `tests/test_agent_docs.py`.
3. **A workflow step or quality bar** → the skill that owns that step in `.codex/skills/`, never the `.claude/skills/` wrapper.
4. **The user's own preference across projects** → the agent's memory, not the repo. If the repo workflow also needs the rule, it goes in the owning skill as well.
5. **A one-off** → nothing. Say so and say why.

Repo rules belong in the repo, where both agents and every session read them: do not leave a repo rule only in memory. If memory already holds one that a skill now covers, propose trimming the memory entry.

### 4. Propose

Present a numbered list and stop:

```text
1. <incident, with the user's words quoted>
   Cause: <phase or rule>; <missing | vague | ignored | one-off | already fixed>, and why
   Fix: <file> > <section>: <add | sharpen | move | cut | none>
   Wording: <exact new text; for a change, old text then new text>
```

Before presenting, check each fix:

- Sharpen an existing rule before adding one. Several incidents with one cause get one fix.
- It does not contradict another skill, `AGENTS.md`, or `docs/practices/`; when two places would say the same thing, keep it in one and point to it.
- The wording states the rule, not the story. The incident goes in the commit message.
- When a section grows, say what it can lose. Name lines the fix makes redundant and propose cutting them.

Ask which items to apply. The user may approve some, reword some, or reject some.

### 5. Apply

Only after approval:

1. Work on branch `update-codex-skills` in its worktree, `.claude/worktrees/update-codex-skills` (ask if it is missing). Check `git status --short` there and leave other work alone.
2. `git fetch origin`, then merge `origin/backend-refactor` into the branch. Pull requests are squash-merged, so merge rather than rebase. Stop and ask on a conflict.
3. Make each approved edit as proposed. Check edited frontmatter by hand (`name`, a quoted `description`), run `tests/test_agent_docs.py` when `AGENTS.md` or `CLAUDE.md` changed, and run `git diff --check`.
4. Memory edits are outside the repo: make them and report them; they are not committed.
5. Commit and push only when the user asks, with `$ship-pr` (its Skill Changes section keeps skill commits apart from app commits). One commit per fix or theme. Subject: the rule, imperative ("Trace a finding's reach end to end before stating it"). Body: the incident and what the skill now says.

## Past Routings

Use these to calibrate:

| Incident | Cause | Home |
|---|---|---|
| User had to ask "did you do a final review?" | vague: the review compared the diff but did not say to read it file by file before reporting done | `implementation-loop` > Completion Review Loop |
| Recon called live code dead, claimed `yards: null` without the response model | vague: reproduction did not require tracing reach | `codebase-recon` > Reproducing Behavior |
| `\b` in macOS `grep -E` silently matched nothing, again | ignored: the rule sat in recon step 4, the miss happened elsewhere | `AGENTS.md` > Searching & Checks |
| A commit the user had not asked for | user preference, and a repo workflow rule | memory, plus `ship-pr` |
| A mutation check could not fail; recorded in Plan Amendments | one-off, handled correctly | nothing |

## Final Response

Before approval: the proposal list and the question. After applying: each fix with its file, the checks run, memory edits made, and whether anything was committed.

## Continuous Skill Improvement

At the end of every invocation, check whether this retro exposed a reusable gap in this skill. Typical evidence:

- A fix landed in the wrong home and had to move.
- The user rejected a proposal as too broad, or a miss came back after its fix.
- A source of corrections was missed in Collect.

When the evidence is concrete, follow the rules under Continuous Skill Improvement in `.codex/skills/make-code-change/SKILL.md`. If no reusable gap appeared, leave the skill unchanged.
