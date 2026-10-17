# Services: workflows and external boundaries

`services/` coordinates work that spans domain objects, repositories, external APIs, and object storage. It also contains the active OCR/parser implementation.

## Main workflows

| Files | Responsibility |
|---|---|
| [scan_service.py](../../services/scan_service.py) | `ScanService.save_reviewed_scan()`: resolve course/tee context, build hole scores, and save a reviewed round. |
| [golfcourse_api_service.py](../../services/golfcourse_api_service.py) | External course search and detail lookup. |
| `mistral_ocr_service.py`, `mistral_scorecard_parser.py`, `gemini_table_merger.py` | OCR, parsed observations, and optional table merging; see [extraction](extraction.md). |
| [ai_service.py](../../services/ai_service.py) | Rule-based recommendations, strengths, and peer comparisons from Analytics. No LLM call. |
| `scan_report_service.py`, `scan_report_sanitizer.py`, `scan_report_crypto.py`, `scan_report_storage.py` | Anonymous report validation, metadata removal, authenticated encryption, and private S3-compatible persistence. |

## How the layers interact

The scan router hands reviewed data to ScanService, which looks up course information and builds models before repository writes. Course resolution can invoke an external provider. The current service still imports API request types, and extraction assembly still lives partly in the router. The intended boundary is a readable orchestration function with focused steps, not a generic service framework.

Report submission is independent of round saving and PostgreSQL. Developer retrieval is through the report CLI described in [failed-scan reports](../failed-scan-reports.md). Do not infer live storage configuration from a checked-in guide or local file.

## Refactor considerations

Model coverage/readiness helpers are available locally, but verified new-course resolution and atomic course/round saving are not yet integrated across services and persistence. AI suggestions inherit Analytics missing-data/eligibility behavior and have additional benchmark/trend issues. See the [Services review](<../../1. Fix backend consistency issues - Services.md>) and shared review decisions before changing those policies.

## Changing this domain

Keep provider credentials and SDK calls on the backend. Separate provider observations from accepted domain values. Give normalization rules and numerical assumptions names and units, preserve retry/failure behavior, and test orchestration with fake repositories/providers. Service tests generally live in `tests/test_<service>.py`; report behavior has separate route, sanitation, crypto, storage, and CLI tests.
