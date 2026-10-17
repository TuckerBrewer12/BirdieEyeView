# Extraction: image to reviewable scorecard

The active scanner is implemented across Services and the scan router. The legacy `llm/` directory contains no Python source in this checkout, so older FULL/SCORES_ONLY/SMART documentation should not guide new edits.

## Current flow

1. Frontend scan hooks prepare an image/PDF and player/course hints. OCR can be prefetched before extraction.
2. [mistral_ocr_service.py](../../services/mistral_ocr_service.py) calls Mistral and normalizes OCR output.
3. [gemini_table_merger.py](../../services/gemini_table_merger.py) can join split table sections with validation/fallback behavior.
4. [mistral_scorecard_parser.py](../../services/mistral_scorecard_parser.py) identifies rows, player selection, and hole columns and returns `ParsedScorecardRows`.
5. [scan.py](../../api/routers/scan.py) assembles parsed fields into the extraction response, including domain conversion, warnings, and confidence metadata.
6. The user reviews/corrects the result. [ScanService](../../services/scan_service.py) handles the separate reviewed-save workflow.

## Observation versus accepted value

OCR output is evidence, not verified golf data. Hole identity, raw/to-par score interpretation, unknown cells, and optional field suppression affect what can safely be assembled. Missing cells must not shift later holes. Provider calls, parsing, normalization, domain validation, and persistence are separate responsibilities even where current code mixes them.

## Planned representation change

The recorded hole-centric parsed representation is a maintainability proposal, not implemented architecture or a demonstrated accuracy improvement. See [backend architecture planning](<../../3. Backend architecture refactor.md>) before replacing parallel arrays. Preserve current contracts first; correctness changes need their own evidence and decisions.

Relevant deterministic tests include `test_mistral_ocr_service.py`, `test_mistral_scorecard_parser.py`, `test_gemini_table_merger.py`, `test_scan_router_helpers.py`, and `test_score_sign_disambiguation.py`. Live evaluation through `scripts.quick_scan_eval` uses provider credits; ordinary documentation/unit checks do not require it.
