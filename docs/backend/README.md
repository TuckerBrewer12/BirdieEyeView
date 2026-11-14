# Backend domain guides

Each guide explains responsibilities, important files, data flow, and where a change belongs. These are orientation guides rather than line-by-line reviews.

| Domain | Guide |
|---|---|
| `models/` | [Golf entities and invariants](models.md) |
| `api/` | [HTTP interface and authentication](api.md) |
| `services/` | [Business workflows and provider/storage adapters](services.md) |
| `database/` | [Persistence and migrations](database.md) |
| `analytics/` | [Statistics, handicap, goals, and exports](analytics.md) |
| Extraction across API/Services; legacy `llm/` | [OCR and scorecard parsing](extraction.md) |
| `tests/` | [Backend test organization](tests.md) |

Read [backend coding practices](../practices/backend.md) before restructuring a domain. These guides explain responsibilities and contracts; they are not a completed correctness audit or an implementation plan.
