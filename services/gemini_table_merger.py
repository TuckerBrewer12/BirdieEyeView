"""Gemini Flash post-processor: detects and merges split scorecard tables.

Mistral OCR sometimes returns the front 9 and back 9 as separate tables
(caused by the physical fold crease or two-column layout on the card).
This service sends the raw markdown to Gemini Flash and asks it to merge
the halves into one clean 18-hole table before the row parser runs.

Falls back to the original markdown if GOOGLE_API_KEY is unset or if the
Gemini call fails, so the pipeline degrades gracefully.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from typing import List, Optional

logger = logging.getLogger(__name__)

GEMINI_MERGE_MODEL = "gemini-3.1-flash-lite-preview"

_CANONICAL_HEADER = [
    "HOLE", "1", "2", "3", "4", "5", "6", "7", "8", "9", "OUT",
    "10", "11", "12", "13", "14", "15", "16", "17", "18", "IN", "TOT",
]
_KNOWN_SEPARATOR_LABELS = {"initials", "initiales", "player"}
_SMALL_VALUE_RE = re.compile(
    r"^(?:[+\-−]?\d{1,2}|[①②③④⑤⑥⑦⑧⑨❶❷❸❹❺❻❼❽❾➀➁➂➃➄➅➆➇➈⓿⓪]|[eE])$"
)

_MERGE_PROMPT = """\
Your task is to merge the following golf scorecard fragments into a single, comprehensive Markdown table.

⚠️ MOST IMPORTANT RULE 1: Copy every cell value EXACTLY as it appears in the input — character-for-character. If a cell contains ① copy ①. If a cell contains 1 copy 1. NEVER convert between circled digits (①②③) and regular digits (123).
⚠️ MOST IMPORTANT RULE 2: NEVER calculate, invent, or guess a missing score. If a row has fewer values than required, you MUST insert an empty cell `| |`. Do NOT perform addition to find `OUT`, `IN`, or missing hole scores. If a value does not exist in the source text, it MUST be `| |`.

STRICT FORMATTING RULES:

Use exactly 22 columns: [HOLE, 1, 2, 3, 4, 5, 6, 7, 8, 9, OUT, 10, 11, 12, 13, 14, 15, 16, 17, 18, IN, TOT].

NO SLASHES: Do not use '394/344' style grouping. Every hole must have its own dedicated column.

ALIGNMENT: Match the 'OUT' values (Holes 1-9) with their corresponding 'IN' values (Holes 10-18) based on the row label. Every data row must have exactly 9 front-nine values and exactly 9 back-nine values.

MISSING CELLS (CRITICAL): OCR often completely drops empty cells, shifting all subsequent numbers to the left. If a row has fewer than 9 score values for a half, you MUST insert empty cells (`| |`) at the correct hole positions to pad it back to 9 values.
- DO NOT shift 'OUT', 'IN', or 'TOT' values into hole columns!
- Hint: If 'OUT' is a large total (e.g., 35-50), hole scores are usually 3-6. If scoring is 'to-par', 'OUT' might be a small number (e.g., 8 or 5) representing the sum of to-par scores (e.g., 1, 0, -1). If a row has 9 values for the front nine, and the 9th value mathematically equals the sum of the first 8 values, that 9th value is DEFINITELY the 'OUT' score. Shift it to the 'OUT' column and add an empty cell `| |` for the missing Hole 9. NEVER fabricate a number for the missing hole.

EMPTY CELLS: If a value is missing, leave the cell blank (| |) instead of omitting it.

REQUIRED STRUCTURE EXAMPLE:
| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | OUT | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | IN | TOT |
| Black | 394 | ... | ... | ... | ... | ... | ... | ... | 180 | 3143 | 565 | ... | ... | ... | ... | ... | ... | ... | 533 | 3711 | 6854 |

DATA TO MERGE:
{markdown}
"""


def _split_pipe_row(line: str) -> List[str]:
    stripped = line.strip()
    if "|" not in stripped:
        return []
    return [cell.strip() for cell in stripped.strip("|").split("|")]


def _source_has_separator_after_out(markdown: str) -> bool:
    """Return whether the source header proves a non-hole column after OUT."""
    for line in markdown.splitlines():
        cells = _split_pipe_row(line)
        upper = [cell.upper() for cell in cells]
        if "OUT" not in upper or "10" not in cells:
            continue
        out_idx = upper.index("OUT")
        ten_idx = cells.index("10")
        between = [cell.lower() for cell in cells[out_idx + 1:ten_idx]]
        if between and all(not cell or cell in _KNOWN_SEPARATOR_LABELS for cell in between):
            return True
    return False


def _is_markdown_separator(cells: List[str]) -> bool:
    return bool(cells) and all(
        cell and set(cell).issubset({"-", ":", " "})
        for cell in cells
    )


def _small_value_count(cells: List[str]) -> int:
    return sum(bool(_SMALL_VALUE_RE.fullmatch(cell.strip())) for cell in cells)


def _normalize_and_validate_merge(source: str, merged: str) -> Optional[str]:
    """Normalize a provable separator shift and reject malformed merge output."""
    source_has_separator = _source_has_separator_after_out(source)
    normalized_rows: List[List[str]] = []
    header_found = False

    for line in merged.splitlines():
        cells = _split_pipe_row(line)
        if not cells:
            if line.strip():
                return None
            continue
        if not any(cells):
            continue

        # Gemini sometimes removes INITIALS from the header but preserves the
        # corresponding blank cell in every data row. Only repair that exact
        # shape when the original Mistral header proves the separator existed.
        if (
            source_has_separator
            and len(cells) == len(_CANONICAL_HEADER) + 1
            and cells[11] == ""
        ):
            cells = cells[:11] + cells[12:]

        if len(cells) != len(_CANONICAL_HEADER):
            return None

        if [cell.upper() for cell in cells] == _CANONICAL_HEADER:
            header_found = True
        elif _is_markdown_separator(cells):
            pass
        else:
            front_count = _small_value_count(cells[1:10])
            back_count = _small_value_count(cells[11:20])
            # A populated half paired with an entirely empty half is not a
            # valid 18-hole merge. Fall back to the untouched source tables.
            if (front_count >= 4 and back_count == 0) or (back_count >= 4 and front_count == 0):
                return None

        normalized_rows.append(cells)

    if not header_found:
        return None

    return "\n".join(
        "| " + " | ".join(cells) + " |"
        for cells in normalized_rows
    )


async def merge_split_tables(markdown: str) -> str:
    """Send *markdown* to Gemini Flash; return merged table (or original on failure)."""
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        logger.debug("GOOGLE_API_KEY not set; skipping Gemini merge step")
        return markdown

    try:
        from google import genai  # imported lazily so missing package doesn't break startup

        client = genai.Client(api_key=api_key)
        prompt = _MERGE_PROMPT.format(markdown=markdown)
        from google.genai import types
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=GEMINI_MERGE_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(
                        disable=True
                    ),
                ),
            ),
            timeout=60,
        )
        merged = (response.text or "").strip()
        # Strip accidental code fences Gemini sometimes adds
        if merged.startswith("```"):
            lines = merged.splitlines()
            merged = "\n".join(
                line for line in lines if not line.startswith("```")
            ).strip()

        if merged:
            normalized = _normalize_and_validate_merge(markdown, merged)
            if normalized is None:
                logger.warning("Gemini table merge failed structural validation; using original markdown")
                return markdown
            logger.info(
                "Gemini table merge complete: input_chars=%d output_chars=%d",
                len(markdown),
                len(normalized),
            )
            return normalized

        logger.warning("Gemini table merge returned empty response; using original")
        return markdown

    except Exception as exc:
        logger.warning("Gemini table merge failed; using original markdown. err=%s", exc)
        return markdown
