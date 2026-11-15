import logging
import os
from pathlib import Path
from typing import List, Optional

from services.gemini_table_merger import merge_split_tables
from services.mistral_ocr_service import MistralOCRService

logger = logging.getLogger(__name__)


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


LOG_SENSITIVE_OCR_DEBUG = _env_bool("LOG_SENSITIVE_OCR_DEBUG", False)
MISTRAL_OCR_MODEL = os.environ.get("MISTRAL_OCR_MODEL") or "mistral-ocr-latest"


async def read_scorecard(ocr_path: Path, diagnostics: Optional[List[str]] = None) -> str:
    svc = MistralOCRService()
    ocr_resp = await svc.ocr_file(ocr_path)

    pages = ocr_resp.get("pages")
    if LOG_SENSITIVE_OCR_DEBUG and isinstance(pages, list):
        for page_idx, page in enumerate(pages):
            if not isinstance(page, dict):
                continue
            tables = page.get("tables") or []
            if not isinstance(tables, list):
                continue
            for table_idx, table in enumerate(tables):
                if not isinstance(table, dict):
                    continue
                html_table = table.get("content")
                if isinstance(html_table, str) and html_table.strip():
                    logger.debug(
                        "Mistral HTML table page=%d table=%d:\n%s",
                        page_idx,
                        table_idx,
                        html_table,
                    )

    raw_markdown = MistralOCRService.extract_markdown_text(ocr_resp, diagnostics)
    if LOG_SENSITIVE_OCR_DEBUG:
        logger.debug("Mistral raw markdown:\n%s", raw_markdown)
    else:
        logger.info("Mistral OCR produced markdown chars=%d", len(raw_markdown))
    return await merge_split_tables(raw_markdown, diagnostics=diagnostics)
