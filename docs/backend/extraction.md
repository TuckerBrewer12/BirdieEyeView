# Extraction: image to reviewable scorecard

The active scanner is implemented across Services and the scan router. The legacy `llm/` directory contains no Python source in this checkout, so older FULL/SCORES_ONLY/SMART documentation should not guide new edits.

## Current flow

1. Frontend scan hooks prepare an image/PDF and player/course hints. OCR can be prefetched before extraction.
1. [scan_uploads.py](../../api/scan_uploads.py) checks the upload (name, content type, 20 MB, decodable image within the size caps, or a parseable PDF) and owns its temporary files: only the request creates temporary files and removes every one afterwards (including after a cancelled request or a failed write, flush or close), logging rather than raising a cleanup failure. File and image work runs in a worker thread that only writes into those existing files and never creates one, so a worker still running after its request was cancelled can't recreate a deleted file. [scan_image.py](../../services/scan_image.py) prepares the OCR input: a browser-ready 2,000 px JPEG passes through, other images become a 2,000 px quality-80 JPEG without metadata, and PDFs go to OCR as uploaded. `/extract` with prefetched OCR text validates the upload but doesn't re-encode it. `/ocr` has no user or database dependency.
2. [mistral_ocr_service.py](../../services/mistral_ocr_service.py) calls Mistral and normalizes OCR output.
3. [gemini_table_merger.py](../../services/gemini_table_merger.py) can join split table sections with validation/fallback behavior.
4. [mistral_scorecard_parser.py](../../services/mistral_scorecard_parser.py) identifies rows, player selection, and hole columns and returns `ParsedScorecardRows`.
5. [scan.py](../../api/routers/scan.py) assembles parsed fields into the extraction response, including domain conversion, warnings, and confidence metadata.
6. The user reviews/corrects the result. [ScanService](../../services/scan_service.py) handles the separate reviewed-save workflow.

## Observation versus accepted value

The course name is never read from the scan: a card may not show it, so the user picks or enters it during review.

OCR output is evidence, not verified golf data. Hole identity, raw/to-par score interpretation, unknown cells, and optional field suppression affect what can safely be assembled. Missing cells must not shift later holes. Provider calls, parsing, normalization, domain validation, and persistence are separate responsibilities even where current code mixes them.

## Planned representation change

A hole-centric parsed representation could make related observations easier to follow than parallel arrays. That is a maintainability proposal, not implemented architecture or a demonstrated accuracy improvement. Preserve current contracts first; correctness changes need their own evidence and decisions.

Relevant deterministic tests include `test_mistral_ocr_service.py`, `test_mistral_scorecard_parser.py`, `test_gemini_table_merger.py`, `test_scan_router_helpers.py`, and `test_score_sign_disambiguation.py`. Live evaluation through `scripts.quick_scan_eval` uses provider credits; ordinary documentation/unit checks do not require it.
