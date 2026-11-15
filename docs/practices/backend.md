# Backend coding practices

## Intended responsibilities

This is the current refactor direction; the source still contains mixed responsibilities in some routers/services.

| Layer | Keep here | Delegate elsewhere |
|---|---|---|
| API | Request/response schemas, dependencies, authentication/authorization, HTTP translation. | Golf calculations, provider parsing, and long save workflows. |
| Services | Readable workflow orchestration and focused provider/storage adapters. | SQL details and intrinsic entity invariants. |
| Models | Valid golf states, safe updates, relationships, and domain calculations. | Network requests, persistence, and HTTP errors. |
| Analytics | Explicitly defined aggregate measurements and improvement calculations. | HTTP assembly, loading unrelated state, and UI styling. |
| Database | Parameterized SQL, transactions, row conversion, and persistence constraints. | UI copy and HTTP status policy. |

A dependency map is a target, not a claim that current imports strictly enforce it. In particular, Services currently uses some API DTOs. Decide a useful shared contract before moving types or adding a new layer.

## Function and module structure

Use a short orchestration function whose named stages reveal the flow. Keep existing focused functions when their responsibility is already clear. Extract repeated observation filtering, historical-par lookup, or classification only after the shared policy is settled; avoid independently reimplementing the same rule in each caller.

Use type annotations for public boundaries and typed internal results where a large dictionary hides required fields/units. Don't write comments or docstrings. Keep only lint and type directives (`noqa`, `type: ignore`), a script's usage and env lines, and gotchas forced by tools or platforms we can't change (an OCR quirk, a driver limitation), stated in one line.

## Validation and updates

Pydantic validates transport/domain inputs, and PostgreSQL enforces persistent invariants under concurrency. Align their agreed bounds. Models use validated replacement/correction methods, explicit coverage, historical accepted par, and unknown-preserving summaries. Persistence, requests, scan assembly, and analytics share those contracts; coordinate changes across their consumers.

Keep omitted and explicit-null updates distinct. Validate coordinated edits before committing mutations. Make one logical multi-record operation atomic through an explicit transaction. Catch expected boundary failures specifically; preserve intended 4xx outcomes and avoid leaking provider details or credentials.

## Async and external work

Await database/network work through its supported async boundary. Check whether image processing, file operations, hashing, or a provider SDK blocks the event loop before calling it in an async router. Preserve cancellation, retry identity, and cleanup behavior when restructuring workflows. Use fake providers/repositories for deterministic tests.

## Python tooling: existing configuration

[pyproject.toml](../../pyproject.toml) configures Ruff with a Python 3.13 target and 120-character line-length setting. The selected lint families focus on correctness/dead code; this is not evidence of an enforced whole-project formatter or a mandate to reformat untouched files. Do not run blanket formatting as part of an unrelated change.

Run focused pytest checks and `ruff check` over relevant changed Python files; broader checks are described in [testing practices](testing.md). Keep functional changes and migrations separately reviewable from mechanical cleanup.
