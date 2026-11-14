# How the application fits together

BirdieEyeView turns a physical golf scorecard into an editable round, stores accepted round data, and summarizes a player's history.

## Main flow

1. The React app selects or captures a scorecard and collects optional player/course context.
2. Scan hooks call FastAPI through the shared API client. OCR and parsing produce observations; the user reviews the resulting scores.
3. Saving passes the reviewed data through scan orchestration, domain models, and PostgreSQL repositories.
4. Dashboard, analytics, career, and improvement pages request summaries derived from saved rounds.
5. A failed scan can be reported explicitly. That is a separate anonymous submission to encrypted private object storage; it is not a saved round or a database scan record.

## Responsibility map

| Source area | Owns |
|---|---|
| `frontend/src/pages`, hooks, context | Page composition, interactive state, query orchestration, and presentation. |
| `api/` | HTTP contracts, authentication/authorization, request dependencies, and error translation. |
| `services/` | Scan workflows, external provider adapters, report storage, and rule-based suggestions. |
| `models/` | Golf entities, validation, relationships, and domain calculations. |
| `analytics/` | Statistics, handicap calculations, goal analysis, and Python chart exports. |
| `database/` | PostgreSQL pool, repositories, schema/migrations, and row/model conversion. |
| `tests/` | Backend behavioral checks and isolated database integration tests. |

This is a responsibility map, not a claim of perfectly one-way imports: some services currently import API DTOs, and some routers still contain substantial business logic. See [backend practices](practices/backend.md) for the refactor direction.

## Frontend entry points

`frontend/src/main.tsx` provides the React Query client. `App.tsx` installs authentication and scan contexts, selects public/authenticated routes, and wraps signed-in pages in `AppLayout`. The same `/` URL shows the landing page when signed out and Dashboard when signed in. The native shell uses the React app through Capacitor.

## Extraction entry points

The active source pipeline is Mistral OCR, optional Gemini table merging, `mistral_scorecard_parser.py`, and assembly in the scan router. The old `llm/` directory has no Python source in this checkout. Older descriptions of FULL/SCORES_ONLY/SMART are not a map of the active pipeline. See [extraction](backend/extraction.md).

## Refactor boundary

The local Models changes introduce explicit round/layout coverage, safe updates, historical-par authority, and format-specific goals. API, Services, Analytics, and Database have not all adopted those contracts. Treat end-to-end save/analytics behavior as integration work, not as completed functionality inferred from a model helper. Review guides describe known limitations without duplicating the full issue backlog.
