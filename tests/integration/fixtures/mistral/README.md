# Mistral OCR captures

Real `POST /v1/ocr` responses for the cards in `tests/test_scorecards/`, captured on
November 13, 2026 with `table_format=html` and no image bytes. The end-to-end scan tests
feed them through the real OCR clean-up, parser and assembly and grade the result against
the quick and large eval manifests' answer keys, with no paid calls. Every manifest case must
have a capture here and a minimum in `test_api_e2e.py`; a test enforces it.

To refresh one, run the live evaluator (`python -m scripts.quick_scan_eval --suite large`,
paid) with `LOG_SENSITIVE_OCR_DEBUG=true` or save the response from
`MistralOCRService.ocr_file`, then raise the case minimums in `test_api_e2e.py` if the
parser now reads more cells.
