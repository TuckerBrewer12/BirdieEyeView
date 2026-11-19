# Services: workflows and external boundaries

`services/` coordinates work that spans domain objects, repositories, external APIs, and object storage. It also contains the active OCR/parser implementation.

## Main workflows

| Files | Responsibility |
|---|---|
| [scan_service.py](../../services/scan_service.py) | `ScanService.save_reviewed_scan()`: takes a `ReviewedScan`, plans and validates the course and round, verifies a provider-picked course, then writes course and round in one transaction. |
| [scan_image.py](../../services/scan_image.py) | `prepare_for_ocr()`: the image OCR receives (pass-through for a browser-ready JPEG or a PDF, otherwise a 2,000 px quality-80 JPEG without metadata); a failed re-encode falls back to the original. It writes into a file the caller created (opened with `open_existing()`, which fails rather than create a file) and never creates or deletes files itself; `new_temp_path()` and `remove_quietly()` (logs instead of raising) are the shared temporary-file helpers. Upload checks live in [api/scan_uploads.py](../../api/scan_uploads.py). |
| [scan_ocr.py](../../services/scan_ocr.py) | OCR/merge orchestration and text-size limits before and after merging. |
| [scan_assembly.py](../../services/scan_assembly.py) | Parsed rows to round payloads, structured per-hole review notes and confidence; no API dependency. |
| [scan_normalization.py](../../services/scan_normalization.py) | Converts scan-derived numbers (`"5"`, `5.0`) to the types strict Models require and rejects values that would need guessing (`true`, `5.5`, words, non-finite numbers). Used by the save request models. |
| [auth_service.py](../../services/auth_service.py) | Sessions (start on sign-in, end on logout, end all on reset), one-time email links, and email verification and password reset, each in one transaction. |
| [user_tee_service.py](../../services/user_tee_service.py) | User-tee create and update: the linked course's layout check and the rating coverage, recomputed when a rating changes. |
| [golfcourse_api_service.py](../../services/golfcourse_api_service.py) | External course search and per-tee course details used only for verification. Every provider failure, including a missing API key, raises `CourseProviderUnavailable`. |
| `mistral_ocr_service.py`, `mistral_scorecard_parser.py`, `gemini_table_merger.py` | OCR, parsed observations, and optional table merging; see [extraction](extraction.md). |
| `scan_report_service.py`, `scan_report_sanitizer.py`, `scan_report_crypto.py`, `scan_report_storage.py` | Anonymous report validation, metadata removal, authenticated encryption, and private S3-compatible persistence. |

## How the layers interact

The scan router checks the selected course's access with `load_linkable_course` (unknown 404, another golfer's 403), then hands the service a `ReviewedScan` built by `SaveRoundRequest.to_reviewed_scan(user_id, course)`: the signed-in golfer's id, the access-checked course, and the scanned tees, holes, scores and date in domain form. The service imports nothing from `api`. It never guesses the course; it uses the user's choice:

- **Existing course (`course_id`):** saved against as-is. A user-owned course has missing holes/tees filled from the scan, and a tee rating sent with the save keeps the holes it covers (a front-nine rating never becomes the 18-hole rating). The app sends back the course's stored ratings, so in practice this guards API clients and round linking. A master course is overwritten from the scan only when the scan covers every hole the master has data for (a front-nine scan never rewrites an 18-hole master, even a legacy one without `total_holes`), the scan differs, the master has a provider ID, and the provider verifies the scan; otherwise it is unchanged. A picked course is checked under its own name when the request has no `course_name`. When it is overwritten, the round's `par_played`/`handicap_played` come from the verified scan. A scanned rating that differs from the master counts as a change, but is written only when the provider confirms it; a rating missing from the scan is not a change, and the master keeps its ratings for that tee.
- **Provider pick (`external_course_id`):** links to an existing course with that ID. Otherwise a new course must pass the completeness check (`Course.has_required_course_data()`); if the provider verifies it, the scanned data becomes one master course, else a user-owned course without the provider ID.
- **Typed name only:** reuses the user's own course with that exact name, or creates a user-owned course that passes the completeness check. No provider call.
- **No course:** rejected.

Verification is an exact match: every scanned tee must equal some provider tee's per-hole yardages (names ignored), the scanned pars must equal that tee's pars. Ratings are hard to read from a card, so they never block verification: a scanned course/slope rating is stored only when the matching provider tee has the same rating, and is otherwise dropped (the master keeps its existing rating for that tee; a new master has none). Provider data is compared in memory and never stored; location is never taken from the scan or the provider. All reads, provider calls and validation happen before the first write; rejected saves raise `ScanSaveRejected` (HTTP 422) and write nothing. Course and round writes share one transaction through `DatabaseManager.transaction()`.

The save service, extraction orchestration and assembly (`scan_service.py`, `scan_ocr.py`, `scan_assembly.py`) import nothing from the API; the router owns request mapping (`SaveRoundRequest.to_reviewed_scan`), course access, catalog wording and HTTP translation. The intended boundary is a readable orchestration function with focused steps, not a generic service framework.

Report submission is independent of round saving and PostgreSQL. Developer retrieval is through the report CLI described in [failed-scan reports](../failed-scan-reports.md). Do not infer live storage configuration from a checked-in guide or local file.

## Refactor considerations

Verified course resolution and the atomic course/round save are part of `backend-refactor`; this does not certify deployment. Parser/OCR/merger review findings and the frontend's handling of the new save rejections remain open.

## Changing this domain

Keep provider credentials and SDK calls on the backend. Separate provider observations from accepted domain values. Give normalization rules and numerical assumptions names and units, preserve retry/failure behavior, and test orchestration with fake repositories/providers. Service tests generally live in `tests/test_<service>.py`; report behavior has separate route, sanitation, crypto, storage, and CLI tests.
