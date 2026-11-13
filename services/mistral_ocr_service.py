"""Client for calling Mistral OCR API with local files."""

from __future__ import annotations

import base64
import logging
import mimetypes
import os
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
try:
    from bs4 import BeautifulSoup
except Exception:  # noqa: BLE001
    BeautifulSoup = None

logger = logging.getLogger(__name__)


class MistralOCRService:
    """Thin wrapper around Mistral OCR API.

    Env vars:
    - MISTRAL_API_KEY (required)
    - MISTRAL_BASE_URL (optional, default: https://api.mistral.ai)
    - MISTRAL_OCR_PATH (optional, default: /v1/ocr)
    - MISTRAL_OCR_MODEL (optional, default: mistral-ocr-latest)
    """

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        ocr_path: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        self._api_key = api_key or os.environ.get("MISTRAL_API_KEY")
        self._base_url = (base_url or os.environ.get("MISTRAL_BASE_URL") or "https://api.mistral.ai").rstrip("/")
        self._ocr_path = ocr_path or os.environ.get("MISTRAL_OCR_PATH") or "/v1/ocr"
        self._model = model or os.environ.get("MISTRAL_OCR_MODEL") or "mistral-ocr-latest"
        self._timeout = timeout_seconds

    async def ocr_file(
        self,
        file_path: str | Path,
        *,
        pages: Optional[str] = None,
        include_images: bool = False,
        include_headers: bool = False,
        include_footers: bool = False,
    ) -> Dict[str, Any]:
        """OCR a local file and return raw Mistral JSON response."""
        if not self._api_key:
            raise EnvironmentError("MISTRAL_API_KEY environment variable is not set")

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        data_url = self._build_data_url(path)
        payload: Dict[str, Any] = {
            "model": self._model,
            "document": {"type": "document_url", "document_url": data_url},
            "include_image_base64": include_images,
            "table_format": "html",
        }
        if pages:
            payload["pages"] = pages
        if include_headers:
            payload["include_headers"] = True
        if include_footers:
            payload["include_footers"] = True

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        path_part = self._ocr_path if self._ocr_path.startswith("/") else f"/{self._ocr_path}"
        async with httpx.AsyncClient(base_url=self._base_url, timeout=self._timeout) as client:
            try:
                resp = await client.post(path_part, headers=headers, json=payload)
                resp.raise_for_status()
                return resp.json()
            except Exception as exc:  # noqa: BLE001
                raise RuntimeError(f"Mistral OCR failed: {exc}") from exc

    def _build_data_url(self, path: Path) -> str:
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        raw = path.read_bytes()
        b64 = base64.b64encode(raw).decode("ascii")
        return f"data:{mime_type};base64,{b64}"

    @staticmethod
    def extract_markdown_text(
        ocr_response: Dict[str, Any],
        diagnostics: Optional[List[str]] = None,
    ) -> str:
        """Convert Mistral OCR HTML tables to markdown for downstream Gemini merge.

        Each HTML table is converted individually to a markdown pipe table, after a
        deterministic clean-up (merged cells expanded, over-wide rows aligned to their
        header) so Gemini stitches a sane input. Gemini handles merging split
        front/back nine tables. ``diagnostics`` collects what the clean-up did.
        """
        pages = ocr_response.get("pages")
        if not isinstance(pages, list):
            output_text = ocr_response.get("markdown") or ocr_response.get("text")
            return output_text if isinstance(output_text, str) else ""

        chunks: List[str] = []
        for page in pages:
            if not isinstance(page, dict):
                continue

            tables: List[Dict[str, Any]] = page.get("tables") or []
            html_tables = [t["content"] for t in tables if isinstance(t.get("content"), str)]

            if html_tables:
                for table_idx, html in enumerate(html_tables):
                    rows = MistralOCRService._html_to_rows(html, diagnostics, table_idx)
                    rows = MistralOCRService._align_rows_to_header(rows, diagnostics, table_idx)
                    md = MistralOCRService._rows_to_markdown(rows)
                    if md:
                        chunks.append(md)

            text = page.get("markdown") or page.get("text")
            if isinstance(text, str) and text.strip():
                if html_tables:
                    # Keep non-table page text (notes/labels) even when table blocks exist.
                    non_table = MistralOCRService._extract_non_table_text(text)
                    if non_table:
                        chunks.append(non_table)
                else:
                    chunks.append(text.strip())

        return "\n\n".join(chunks)

    @staticmethod
    def _html_to_rows(
        html: str,
        diagnostics: Optional[List[str]] = None,
        table_idx: int = 0,
    ) -> List[List[str]]:
        """Parse an HTML table into a list of row cell-lists.

        ``colspan``/``rowspan`` are expanded into empty cells so every row keeps one
        cell per column; dropping them shifts every later value one column left.
        """
        if BeautifulSoup is not None:
            soup = BeautifulSoup(html, "html.parser")
            raw_rows = [
                [
                    (cell.get_text(" ", strip=True), _span(cell.get("rowspan")), _span(cell.get("colspan")))
                    for cell in tr.find_all(["th", "td"])
                ]
                for tr in soup.find_all("tr")
            ]
        else:
            raw_rows = _StdlibTableParser.parse(html)
        return _expand_spans(raw_rows, diagnostics, table_idx)

    @staticmethod
    def _align_rows_to_header(
        rows: List[List[str]],
        diagnostics: Optional[List[str]] = None,
        table_idx: int = 0,
    ) -> List[List[str]]:
        """Align the data rows of one table to the hole header found in that table."""
        header_idx = next((i for i, row in enumerate(rows) if _hole_header_width(row)), None)
        if header_idx is None:
            return rows
        return align_rows_to_header(rows, rows[header_idx], diagnostics, where=f"ocr table {table_idx}")

    @staticmethod
    def _rows_to_markdown(rows: List[List[str]]) -> str:
        """Convert a list of rows to a markdown pipe table string."""
        if not rows:
            return ""
        return "\n".join(
            "| " + " | ".join(cell.replace("|", "/") for cell in row) + " |"
            for row in rows
        )

    @staticmethod
    def _extract_non_table_text(text: str) -> str:
        """Remove markdown table lines and keep surrounding non-table text."""
        kept_lines: List[str] = []
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("|"):
                continue
            if set(line) <= {"-", ":", "|", " "}:
                continue
            kept_lines.append(line)
        return "\n".join(kept_lines).strip()


_HOLE_RUN_MIN = 6
_RATING_RE = re.compile(r"^\d{2}(?:\.\d)?\s*/\s*\d{2,3}$")


def _span(value: Any) -> int:
    try:
        return max(1, int(str(value)))
    except (TypeError, ValueError):
        return 1


def _expand_spans(
    raw_rows: List[List[tuple[str, int, int]]],
    diagnostics: Optional[List[str]],
    table_idx: int,
) -> List[List[str]]:
    """Lay cells onto a grid, carrying rowspan/colspan into empty cells."""
    grid: List[List[str]] = []
    pending: Dict[tuple[int, int], str] = {}  # (row, col) -> filler for a rowspan
    expanded = 0
    for r, cells in enumerate(raw_rows):
        row: List[str] = []
        col = 0
        for text, rowspan, colspan in cells:
            col = _fill_pending(row, pending, r, col)
            for k in range(colspan):
                row.append(text if k == 0 else "")
                for dr in range(1, rowspan):
                    pending[(r + dr, col + k)] = ""
            if rowspan > 1 or colspan > 1:
                expanded += 1
            col += colspan
        _fill_pending(row, pending, r, col)
        if row:
            grid.append(row)
    if expanded and diagnostics is not None:
        diagnostics.append(f"ocr table {table_idx}: expanded {expanded} merged cell(s) into the grid")
    return grid


def align_rows_to_header(
    rows: List[List[str]],
    header: List[str],
    diagnostics: Optional[List[str]] = None,
    *,
    where: str = "table",
) -> List[List[str]]:
    """Make each data row the header's width so hole values sit under the header's columns.

    Mistral often gives a row a different number of cells than the header:
    - wider by ``k``: an extra leading label cell (the player's name in its own cell, or a
      tee rating such as ``72.2/135``); dropped when the first ``k + 1`` cells are label-like;
    - narrower by ``k``: a missing leading label cell (the row has fewer label cells than the
      header has before hole 1), padded with empty cells; or a missing separator column
      between OUT and hole 10 (``INITIALS``), padded at the header's separator columns.
    Anything else is left as it is and reported, so values are never guessed into place.
    """
    width = len(header)
    label_count = _leading_label_count(header)
    separator_cols = _separator_columns(header)
    aligned: List[List[str]] = []
    for row_idx, row in enumerate(rows):
        extra = len(row) - width
        note: Optional[str] = None
        if row is header:
            pass
        elif extra > 0:
            leading = row[: extra + 1]
            if all(_is_label_like(cell) for cell in leading):
                # Keep the name-like cell ("Blue" over "72.2/135"; "D" over an empty cell).
                label = next(
                    (cell for cell in leading if any(ch.isalpha() for ch in cell) and not _RATING_RE.match(cell.strip())),
                    next((cell for cell in reversed(leading) if cell), ""),
                )
                row = [label] + row[extra + 1 :]
                note = f"dropped {extra} extra leading cell(s)"
            else:
                note = f"{extra} cell(s) wider than the hole header but the leading cells hold values; left unaligned"
        elif extra < 0:
            missing = -extra
            row_labels = _leading_label_count(row)
            notes: List[str] = []
            if row_labels < label_count:
                pad = min(missing, label_count - row_labels)
                row = row[:row_labels] + [""] * pad + row[row_labels:]
                missing -= pad
                notes.append(f"padded {pad} missing leading label cell(s)")
            if missing and missing == len(separator_cols):
                for col in separator_cols:
                    row = row[:col] + [""] + row[col:]
                notes.append(f"padded the missing separator column(s) at {separator_cols}")
                missing = 0
            if missing and row and not _is_label_like(row[-1]):
                row = row + [""] * missing  # the row stops at its last value: trailing columns are missing
                notes.append(f"padded {missing} missing trailing cell(s)")
                missing = 0
            if missing:
                row = rows[row_idx]
                notes = [f"{missing} cell(s) narrower than the hole header; left unaligned"]
            note = "; ".join(notes)
        elif separator_cols and row and _is_label_like(row[-1]):
            # Same width, but a hole value sits in the separator column (INITIALS): the row is
            # missing that blank and carries an extra blank at the end instead.
            shifted = [col for col in separator_cols if not _is_label_like(row[col])]
            if shifted:
                for col in shifted:
                    row = row[:col] + [""] + row[col:-1]
                note = f"back nine shifted right past the separator column(s) at {shifted}"
        aligned.append(row)
        if diagnostics is not None and note:
            diagnostics.append(f"{where} row {row_idx}: {note}")
    return aligned


def _leading_label_count(row: List[str]) -> int:
    """Cells before the first cell holding a number (the row's label cells)."""
    count = 0
    for cell in row:
        if _is_label_like(cell) and not cell.strip().isdigit():
            count += 1
        else:
            break
    return count


def _separator_columns(header: List[str]) -> List[int]:
    """Header columns between the OUT column and hole 10 (e.g. an INITIALS column)."""
    positions = {cell.strip(): i for i, cell in enumerate(header)}
    nine, ten = positions.get("9"), positions.get("10")
    if nine is None or ten is None or ten <= nine + 1:
        return []
    return list(range(nine + 2, ten))  # nine + 1 is the OUT column


def _fill_pending(row: List[str], pending: Dict[tuple[int, int], str], r: int, col: int) -> int:
    """Append the filler cells a rowspan from an earlier row left at (r, col...)."""
    while (r, col) in pending:
        row.append(pending.pop((r, col)))
        col += 1
    return col


def _hole_header_width(row: List[str]) -> bool:
    """A header row holds a run of consecutive hole numbers (1..9 or 10..18)."""
    run = 0
    previous: Optional[int] = None
    for cell in row:
        try:
            n = int(cell.strip())
        except ValueError:
            n = None
        if n is not None and 1 <= n <= 18 and (previous is None or n == previous + 1):
            run += 1
            previous = n
            if run >= _HOLE_RUN_MIN:
                return True
        else:
            run, previous = 0, None
    return False


def _is_label_like(cell: str) -> bool:
    """Empty, non-numeric text, or a tee rating: never a hole value."""
    text = cell.strip()
    if not text:
        return True
    if _RATING_RE.match(text):
        return True
    return not any(ch.isdigit() for ch in text)


class _StdlibTableParser(HTMLParser):
    """Fallback when BeautifulSoup is unavailable; yields (text, rowspan, colspan) cells."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: List[List[tuple[str, int, int]]] = []
        self._in_row = False
        self._in_cell = False
        self._cell_parts: List[str] = []
        self._cell_spans = (1, 1)
        self._current_row: List[tuple[str, int, int]] = []

    @classmethod
    def parse(cls, html: str) -> List[List[tuple[str, int, int]]]:
        parser = cls()
        parser.feed(html)
        return parser.rows

    def handle_starttag(self, tag: str, attrs: List[tuple[str, Optional[str]]]) -> None:
        lower = tag.lower()
        if lower == "tr":
            self._in_row = True
            self._current_row = []
        elif self._in_row and lower in {"td", "th"}:
            self._in_cell = True
            self._cell_parts = []
            attr_map = {name.lower(): value for name, value in attrs}
            self._cell_spans = (_span(attr_map.get("rowspan")), _span(attr_map.get("colspan")))

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._cell_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        lower = tag.lower()
        if self._in_row and lower in {"td", "th"} and self._in_cell:
            text = " ".join("".join(self._cell_parts).split())
            self._current_row.append((text, *self._cell_spans))
            self._in_cell = False
            self._cell_parts = []
        elif lower == "tr" and self._in_row:
            if self._current_row:
                self.rows.append(self._current_row)
            self._in_row = False
            self._current_row = []
