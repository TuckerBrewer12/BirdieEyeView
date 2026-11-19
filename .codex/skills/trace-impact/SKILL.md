---
name: trace-impact
description: "Project-specific impact tracing skill for the Golf ScoreCard app. Use before changing, moving, renaming or deleting code, a file, a DB column, an endpoint, a request or response field, or an env setting, and before claiming that something is dead, unused, only used by X, what the API sends or the app sends, or what a change affects. Triggers on \"is this used\", \"safe to delete\", \"who calls\", \"what does this affect\", moving or renaming code, and codebase-recon findings. Finds every reference across all files git knows and traces runtime reach end to end, labelling each claim verified or unverified."
---

# Trace Impact

## Purpose

Find everything that depends on a target and trace the effect end to end before changing it or making a claim about it. Nothing is called dead, unused or "affects X" without this trace.

This skill is read-only. The only edits allowed are a throwaway probe or a deliberate breakage (see Prove It), both undone before you finish. `$codebase-recon` uses it for findings that move, delete or change shared code, or that state who is affected; it also works alone ("is `find_course_by_name` safe to delete?").

## Inputs

Write both down before searching:

- **Target:** a Python symbol or module, a TypeScript export, a file, a table or column, an endpoint, a request or response field, an env setting, or a JSON key.
- **Question:** safe to delete? who calls it? what does changing it reach? does the API (or the app) send X?

The verdict answers that question and nothing wider.

## Search Rules

These extend `AGENTS.md` > Searching & Checks and hold for every step.

- Search every file git knows, never a chosen list of folders. From the repository root, `git grep -n --untracked <pattern>` covers tracked and new uncommitted files, skips gitignored ones (`.codex/change-artifacts/`, `handoff.md`) and includes hidden folders (`.github/`, `.codex/`). Callers live in `data/`, `scripts/`, `tests/`, `.github/`, `frontend/`, docs, SQL and JSON, so do not narrow by path or extension until a broad search shows which kinds of file hold hits.
- `rg` is not installed everywhere. When you use it, add `--hidden --glob '!.git'`: by default it skips `.github/` and `.codex/`.
- No `\b`: BSD `grep -E`, `git grep -E` and `sed` silently match nothing with it. Use `-w` or the Python scripts below.
- `-w` never matches a name starting with `.`. For a method call, search `[.]name\(` without `-w` (`db.courses.find_course_by_name(`).
- Search the bare name first (`git grep -n -w --untracked <name>`), then narrower forms. For a module or file, also search its dotted path, slash path and module name (`api.auth_utils`, `api/auth_utils`, `auth_utils`): that catches `mock.patch("api.auth_utils.x")`, doc links and file lists.
- Frontend code renames API fields to camelCase (`front_nine` becomes `frontNine` in `frontend/src/domain/`). Search both spellings.
- An empty result is a claim too. Run the same command on a name you know exists (the target's own definition) and see it match before trusting an empty search.

## Steps

### 1. Text Reach

Run the searches above and list every hit. Read each one; a matching name can be a different thing (`yards` is a field on several unrelated models).

### 2. Python Imports

Text search misses relative imports (`from .course_repo import`) and names reached through a module alias. This script parses every Python file git knows, imports nothing, and prints each import of the target in any form (`from x import y [as z]`, `import x.y [as z]`, `from . import y`, `from .mod import y`, imports inside functions) plus every attribute use through a module alias (`auth_utils.decode_access_token`). To keep only some names, add them after the module (`- api.auth_utils decode_access_token`):

```bash
.venv/bin/python - api.auth_utils <<'EOF'
import ast, subprocess, sys
target, names = sys.argv[1], set(sys.argv[2:])
files = subprocess.run(["git", "ls-files", "-co", "--exclude-standard", "*.py"],
                       capture_output=True, text=True, check=True).stdout.split()
for path in files:
    try:
        tree = ast.parse(open(path, encoding="utf-8").read())
    except (SyntaxError, OSError, UnicodeDecodeError) as exc:
        print(f"{path}: NOT PARSED ({exc})"); continue
    here = path[:-3].replace("/", ".").split(".")[:-1]
    bound = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                if a.name == target or a.name.startswith(target + "."):
                    print(f"{path}:{node.lineno}: import {a.name}" + (f" as {a.asname}" if a.asname else ""))
                    bound.add(a.asname or a.name)
        elif isinstance(node, ast.ImportFrom):
            mod = ".".join((here[:len(here) - node.level + 1] if node.level else [])
                           + ([node.module] if node.module else []))
            for a in node.names:
                text = f"from {'.' * node.level}{node.module or ''} import {a.name}" + (f" as {a.asname}" if a.asname else "")
                if f"{mod}.{a.name}" == target:
                    print(f"{path}:{node.lineno}: {text}"); bound.add(a.asname or a.name)
                elif mod == target and (not names or a.name in names or a.name == "*"):
                    print(f"{path}:{node.lineno}: {text}")
                elif mod.startswith(target + ".") and not names:
                    print(f"{path}:{node.lineno}: {text}")
    for node in ast.walk(tree):
        if isinstance(node, ast.Attribute) and ast.unparse(node.value) in bound \
                and (not names or node.attr in names):
            print(f"{path}:{node.lineno}: {ast.unparse(node.value)}.{node.attr}")
EOF
```

Then follow re-exports: when a package `__init__.py` imports the name (`database/repositories/__init__.py` has `from .course_repo import CourseRepositoryDB`), run the script again for the package and that name (`database.repositories CourseRepositoryDB`, then `database CourseRepositoryDB`) until no new `__init__.py` appears. A re-export nothing imports is itself dead (`tests/test_package_exports.py` fails on one in `analytics`, `api` or `services`). A worktree without `.venv` uses the main checkout's Python.

Methods are not imported: a repository method is reached as `db.courses.<name>(`, so step 1's `[.]name\(` search is the one that finds its callers.

### 3. Dynamic References

None of these show up as an import. Search for each that fits the target:

- string names: `getattr`/`setattr`, `monkeypatch.setattr(module, "name", ...)`, `mock.patch("pkg.mod.name")`, `__all__`
- field-to-column maps: `ROUND_FIELDS` in `api/routers/rounds.py`, `ROUND_FIELD_MAP` in `database/repositories/round_repo.py`
- SQL in strings: table and column names in repositories, migrations and tests
- route paths (see Endpoint below)
- env var names, read as a string through the env helpers (`env_int("NAME", ...)`, `env_bool`; find them with `git grep -n 'def _*env_'`), `os.environ` or `os.getenv`
- JSON keys: `data/*.json`, `tests/integration/fixtures/`, `frontend/openapi.json`
- pytest fixtures, which tests use by parameter name only
- Pydantic fields, which `model_dump()` and response serialization reach without naming them

### 4. Is The Caller Itself Live?

A hit only matters if its file runs. Find each hit file's own entry point:

- app code reached from `api/main.py` (routers via `include_router`) or the frontend (`frontend/src/main.tsx`, `App.tsx` routes)
- a script with `if __name__ == "__main__"` run by hand (`data/load_player_data.py`), from `.github/workflows/*.yml`, from `frontend/package.json` scripts, or from a command in `docs/`, `README.md` or `AGENTS.md`: search the file's path across all files
- tests under `tests/` and `frontend/**/tests/`

A file with no importers is not dead until this step finds no entry point either.

### 5. Runtime Reach

Follow the chain that fits the target. Static hits say where a name appears; this says what a client, the database or a user actually sees.

**Response field.** A value is a response value only when a response sends it:

1. Where the value comes from: the model or service method. A method returning `None` is not a response value yet.
2. The builder in `api/*_responses.py` that puts it into a response model (`api/schemas.py`, plus the auth and report schema modules).
3. Which routes return it, at what path (`[]` marks a list item). Only declared `response_model`s appear; read any route that returns a raw dict or `Response`:

   ```bash
   PYTHONDONTWRITEBYTECODE=1 .venv/bin/python - yards <<'EOF'
   import sys, typing
   from fastapi.routing import APIRoute
   from pydantic import BaseModel
   from api.main import app
   field = sys.argv[1]
   def walk(tp, path, seen):
       for arg in typing.get_args(tp):
           yield from walk(arg, path + ("[]" if typing.get_origin(tp) in (list, tuple, set) else ""), seen)
       if isinstance(tp, type) and issubclass(tp, BaseModel) and tp not in seen:
           for name, info in tp.model_fields.items():
               if name == field:
                   yield f"{path}.{name} ({tp.__name__})"
               yield from walk(info.annotation, f"{path}.{name}", seen | {tp})
   for route in app.routes:
       if isinstance(route, APIRoute) and route.response_model is not None:
           for hit in walk(route.response_model, "", frozenset()):
               print(",".join(sorted(route.methods)), route.path, route.response_model, "->", hit)
   EOF
   ```

4. `frontend/openapi.json` (confirm it is current with `.venv/bin/python scripts/dump_openapi.py --check`, which writes nothing) and `frontend/src/types/api.gen.ts`.
5. The alias in `frontend/src/types/api.ts` (`RoundDto = Schemas["RoundResponse"]`), the mapper in `frontend/src/domain/*.ts` that reads it (`dto.yards`), and the screens that use the mapped value. A field the frontend never reads reaches API clients only.

**Request field (what the app sends).** The request model is in `api/request_models.py` or `api/schemas.py`. What the app really sends is built in `frontend/src`: `lib/api.ts`, `data/*Repository.ts`, `domain/*.ts` and the page view models (such as `pages/scan/scanModel.ts` and `pages/scan/useSaveScan.ts`). Search the field in both spellings under `frontend/src`, leaving out `types/api.gen.ts`, and read the builder. A field no frontend builder sets is not sent by the app, whatever a hand-written request can do. Scripts and tests are other senders; name them separately. A bug that needs such a field is reachable, not reached: say which callers can trigger it.

**Endpoint.** The full path is the prefix in `api/main.py` (`include_router(rounds.router, prefix="/api/rounds")`) plus the decorator path, so it is never written in one piece. `frontend/src/lib/api.ts` adds `/api` itself and fills parameters with template strings (`` fetchJSON<RoundDto>(`/rounds/${roundId}`) ``): search the path without `/api` and without the `{param}`, then the `api.ts` function's callers under `frontend/src`. Tests call the full path (`tests/integration/test_api_e2e.py`). `api.gen.ts` lists every path; that is not a caller.

**Table or column.** `database/schema.sql`, `database/migrations/*.sql` (checked by `scripts/ci/check_migrations.py`), `database/sample_data.sql`, SQL strings in `database/repositories/`, row keys in `database/converters.py`, the field-to-column maps above, seeding scripts in `data/`, and SQL in tests. A column renamed in the schema needs a migration; a model field renamed needs the converter and the maps.

**Env setting.** The reader (step 3), `.env.example` (checked by `scripts/ci/check_env_example.py`), `.github/workflows/*.yml`, tests that set it, and docs under `docs/`.

**TypeScript export.** `git grep` for the name under `frontend/` (imports, re-exports from `index.ts` files, tests, previews), then `npm run knip` in `frontend/` for unused files.

### 6. Prove It

When static search cannot settle the question, prove it:

- **Runtime claims** (what a client sees, what a request does): a throwaway probe as in `$codebase-recon` > Reproducing Behavior, deleted before you finish.
- **"Is it used?":** a deliberate breakage. Copy the file aside, rename or remove the target, then run the unit suite (`.venv/bin/python -m pytest -q --ignore=tests/integration`), the integration suite when a disposable test database is configured (`docs/practices/testing.md`), and `npm run typecheck` in `frontend/` for TypeScript. Restore by copying the file back, check `git diff -- <file>` matches what it was before, and delete the `__pycache__` folders before any rerun (`AGENTS.md` > Searching & Checks). Do not restore with `git checkout` or `git stash`: they discard uncommitted work in the file.

A failure proves use. A clean run does not prove dead code: the suites do not run `data/` or `scripts/` entry points, and they skip code without tests. Dead needs steps 1 to 4 as well.

### 7. Verdict

Label each reference, then the target:

- **live:** used by app code (step 4) or CI.
- **script-only:** used only by a manual entry point in `data/` or `scripts/`. Live while that script is still run; say so and leave the call to the user.
- **test-only:** only tests use it. It is dead for the app; deleting it means deleting or rewriting those tests. Say which.
- **doc-only:** only docs name it. Not a use, but the docs need updating with the change (`AGENTS.md` and `CLAUDE.md` together).
- **dead:** nothing outside its own definition.

Mark each **verified** (you ran the search or probe and read the hit) or **unverified** (say what is missing). State only the reach you traced.

## Output

Reply with this, or put it in the recon artifact under the section it supports (usually `### Callers`) when `$codebase-recon` called the skill:

```markdown
### Impact: <target>
Question: <the question>

| Reference | Kind | Live? | Note |
|---|---|---|---|
| `<file>:<line>` | <definition, import, call, attribute, string, SQL, route, env, JSON, test, doc> | <live, script-only, test-only, doc-only> | <what it does with the target> |

Runtime reach: <the chain from step 5, one hop per line, or "not API- or DB-facing">
Verdict: <answer to the question>; <verified | unverified: what is missing>
Searches: <the commands run, so a reviewer can rerun them>
```

## Continuous Skill Improvement

At the end of every invocation, check whether this trace exposed a reusable gap in this skill. Typical evidence:

- A reference turned up later that these searches missed (a new import form, dynamic reference or file kind).
- A landmark above was renamed, moved or wrong.
- A verdict stated as verified turned out wrong.

When the evidence is concrete, follow the rules under Continuous Skill Improvement in `.codex/skills/make-code-change/SKILL.md`. If no reusable gap appeared, leave the skill unchanged.
