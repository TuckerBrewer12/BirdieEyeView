"""Read a scorecard photo with Gemini, returning the same shape as Mistral OCR.

Experimental: lets the scan pipeline swap Mistral OCR for a Gemini model while the
stitching step (``gemini_table_merger``) and the row parser stay unchanged. The response
mimics Mistral's ``{"pages": [{"markdown", "tables": [{"content": <html>}]}]}`` so
``MistralOCRService.extract_markdown_text`` converts it exactly as it converts Mistral's.
"""

from __future__ import annotations

import asyncio
import json
import mimetypes
import os
from pathlib import Path
from typing import Any, Dict

GEMINI_OCR_MODEL = "gemini-3-flash-preview"
GEMINI_OCR_TIMEOUT_SECONDS = 60

_OCR_PROMPT = """Transcribe this golf scorecard photo exactly as printed and written.

Return JSON with two keys:
- "tables": a list of strings, one per table on the card, each an HTML <table> using only <tr> and <td>.
- "text": any text outside the tables (course name, tee names, notes), in reading order.

Table rules:
- One <tr> per row on the card and one <td> per column, left to right, in the order they appear.
- Keep every column, including OUT, IN, TOT, HCP and NET columns.
- Do not use colspan or rowspan. If a label spans several rows or columns, write it in the first cell and leave the other cells empty.
- Copy each cell as written, including handwritten scores. Leave a cell empty (<td></td>) when nothing is written in it.
- Never calculate, infer or fill in a value that is not on the card.
- If the front nine and back nine are printed as separate sections, transcribe them as they appear. Do not merge them.
"""


class GeminiOCRService:
    """Drop-in for ``MistralOCRService.ocr_file`` backed by a Gemini vision model."""

    def __init__(self, *, api_key: str | None = None, model: str = GEMINI_OCR_MODEL) -> None:
        self._api_key = api_key or os.environ.get("GOOGLE_API_KEY")
        self._model = model

    async def ocr_file(self, file_path: str | Path) -> Dict[str, Any]:
        if not self._api_key:
            raise EnvironmentError("GOOGLE_API_KEY environment variable is not set")
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        from google import genai  # imported lazily, as in gemini_table_merger
        from google.genai import types

        mime_type = mimetypes.guess_type(path.name)[0] or "image/jpeg"
        try:
            client = genai.Client(api_key=self._api_key)
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=self._model,
                    contents=[types.Part.from_bytes(data=path.read_bytes(), mime_type=mime_type), _OCR_PROMPT],
                    config=types.GenerateContentConfig(
                        temperature=0,
                        response_mime_type="application/json",
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                    ),
                ),
                timeout=GEMINI_OCR_TIMEOUT_SECONDS,
            )
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"Gemini OCR failed: {exc}") from exc
        return to_mistral_shape(response.text or "")


def to_mistral_shape(raw_json: str) -> Dict[str, Any]:
    """Convert Gemini's JSON reply into a Mistral-shaped OCR response."""
    try:
        data = json.loads(raw_json)
    except ValueError as exc:
        raise RuntimeError("Gemini OCR returned invalid JSON") from exc
    if not isinstance(data, dict):
        raise RuntimeError("Gemini OCR returned JSON that is not an object")
    tables = [table for table in data.get("tables") or [] if isinstance(table, str) and table.strip()]
    text = data.get("text") if isinstance(data.get("text"), str) else ""
    return {"pages": [{"markdown": text, "tables": [{"content": table} for table in tables]}]}
