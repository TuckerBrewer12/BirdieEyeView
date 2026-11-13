# Extraction: image to reviewable scorecard

The active scanner is implemented across Services and the scan router. The legacy `llm/` directory contains no Python source in this checkout, so older FULL/SCORES_ONLY/SMART documentation should not guide new edits.

## Current flow

1. Frontend scan hooks prepare an image/PDF and player/course hints. OCR can be prefetched before extraction.
2. [mistral_ocr_service.py](../../services/mistral_ocr_service.py) calls Mistral (HTML tables) and cleans each table up deterministically before anything else sees it: merged cells (`rowspan`/`colspan`) are expanded into the grid, and data rows that are wider or narrower than their hole header are aligned to it (a name in its own cell, a tee rating after the label, a missing `INITIALS` separator column). Only structure that the table itself proves is changed; anything else is left alone and reported.
3. [gemini_table_merger.py](../../services/gemini_table_merger.py) asks Gemini to stitch split front/back tables into one canonical 22-column table and validates the result; a rejected merge names the rule and line and falls back to the cleaned tables.
4. [mistral_scorecard_parser.py](../../services/mistral_scorecard_parser.py) identifies rows, player selection, and hole columns and returns `ParsedScorecardRows`. It reads both the stitched table and the cleaned raw tables: split halves are grouped into front and back sections by block (headerless tables are voted to a side by their subtotal columns and aligned to that side's header), player rows are paired across halves by ordinal when both halves have the same number of them, the player's name may sit in either label cell, and on to-par cards an unlabeled or mislabeled par row is recognised by its values plus a matching subtotal. When the named row is missing and exactly one player block has no name label, that block is used and the round carries a user-visible review warning (`PLAYER_NAME_NOT_READ`).
5. [scan.py](../../api/routers/scan.py) assembles parsed fields into the extraction response, including domain conversion, warnings, and confidence metadata. "Name is unclear" is returned only when no row carried the given name; otherwise the rows were unreadable.
6. The user reviews/corrects the result. [ScanService](../../services/scan_service.py) handles the separate reviewed-save workflow.

## Diagnostics versus review warnings

`ParsedScorecardRows.warnings` becomes `fields_needing_review` and is shown to the user, so it holds only catalog text. `ParsedScorecardRows.diagnostics`, the OCR clean-up notes and the merge outcome are internal: each decision or refusal is recorded as one line ("split halves have 6 vs 7 player rows; ordinal pairing refused", "table merge rejected: line 7 has 23 columns, expected 22"), logged by the router as one `Scan diagnostics` line per stage, attached to `ScanExtractionError.diagnostics`, and printed under each case in the eval report. They never enter the API response or failed-scan reports.

## Observation versus accepted value

The course name is never read from the scan: a card may not show it, so the user picks or enters it during review.

OCR output is evidence, not verified golf data. Hole identity, raw/to-par score interpretation, unknown cells, and optional field suppression affect what can safely be assembled. Missing cells must not shift later holes. Provider calls, parsing, normalization, domain validation, and persistence are separate responsibilities even where current code mixes them.

## Planned representation change

A hole-centric parsed representation could make related observations easier to follow than parallel arrays. That is a maintainability proposal, not implemented architecture or a demonstrated accuracy improvement. Preserve current contracts first; correctness changes need their own evidence and decisions.

The main regression gate is end to end: `tests/integration/test_api_e2e.py` runs real Mistral captures (`tests/integration/fixtures/mistral/`) through `/api/scan/ocr` and `/api/scan/extract` with the merge skipped and grades them against the large eval manifest, with a per-case minimum. Deterministic unit tests for the individual rules are `test_mistral_ocr_service.py`, `test_mistral_scorecard_parser.py`, `test_gemini_table_merger.py`, `test_scan_router_helpers.py`, and `test_score_sign_disambiguation.py`. Live evaluation through `scripts.quick_scan_eval` uses provider credits; ordinary documentation/unit checks do not require it.
