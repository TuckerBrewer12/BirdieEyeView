"""Scorecard upload validation and temporary-file ownership for the scan and report routes.

Every check raises ``HTTPException`` with a catalogued message. ``prepared_upload`` is the one way
the scan routes take an upload: its temporary files are created before any worker thread starts,
file and image work runs in a worker thread, and every file is removed on the way out (even if the
request is cancelled) without a cleanup failure ever replacing the request's own outcome.
"""

import contextlib
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncIterator

from fastapi import HTTPException, UploadFile
from PIL import Image
from pypdf import PdfReader
from starlette.concurrency import run_in_threadpool

from api.messages import (
    FILE_TOO_LARGE, FILENAME_REQUIRED, HEIC_UNAVAILABLE, IMAGE_DIMENSIONS_TOO_LARGE, IMAGE_PIXELS_TOO_MANY,
    INVALID_IMAGE_DIMENSIONS, INVALID_PDF, UNREADABLE_IMAGE, UNSUPPORTED_CONTENT_TYPE, UNSUPPORTED_FILE_TYPE,
    UNSUPPORTED_IMAGE_FORMAT,
)
from services.scan_image import new_temp_path, open_existing, prepare_for_ocr, remove_quietly

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
MAX_IMAGE_PIXELS = 40_000_000
MAX_IMAGE_SIDE = 12_000
_CHUNK_BYTES = 1024 * 1024


def _initialize_heic_decoder() -> bool:
    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception as exc:  # noqa: BLE001
        logger.warning("HEIC/HEIF decoder initialization failed: %s", exc)
        return False

    registered_extensions = Image.registered_extensions()
    return ".heic" in registered_extensions or ".heif" in registered_extensions


HEIC_DECODE_AVAILABLE = _initialize_heic_decoder()
BASE_UPLOAD_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_UPLOAD_SUFFIXES = set(BASE_UPLOAD_SUFFIXES)
if HEIC_DECODE_AVAILABLE:
    ALLOWED_UPLOAD_SUFFIXES.add(".heic")

ALLOWED_UPLOAD_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
if HEIC_DECODE_AVAILABLE:
    ALLOWED_UPLOAD_MIME_TYPES.update(
        {
            "image/heic",
            "image/heif",
            "application/octet-stream",  # some mobile clients use this for HEIC
        }
    )

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
if HEIC_DECODE_AVAILABLE:
    ALLOWED_IMAGE_FORMATS.update({"HEIC", "HEIF"})


def check_upload_name(file: UploadFile) -> str:
    """Return the upload's lower-case suffix after checking its name and declared content type."""
    filename = (file.filename or "").strip()
    if not filename:
        raise HTTPException(400, FILENAME_REQUIRED)
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        if suffix == ".heic" and not HEIC_DECODE_AVAILABLE:
            raise HTTPException(400, HEIC_UNAVAILABLE)
        raise HTTPException(
            400, UNSUPPORTED_FILE_TYPE.format(suffix=suffix, allowed=", ".join(sorted(ALLOWED_UPLOAD_SUFFIXES)))
        )
    content_type = (file.content_type or "").lower().strip()
    if content_type and content_type not in ALLOWED_UPLOAD_MIME_TYPES:
        raise HTTPException(400, UNSUPPORTED_CONTENT_TYPE.format(content_type=content_type))
    return suffix


def write_upload(file: UploadFile, path: Path) -> None:
    """Stream the upload into the caller's existing file at ``path``, enforcing the size limit.

    Closing is part of the write. The file is never created here, so a write still running after
    its request was cancelled and cleaned up fails instead of recreating the file.
    """
    total_bytes = 0
    with open_existing(path) as out:
        while chunk := file.file.read(_CHUNK_BYTES):
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_BYTES:
                raise HTTPException(413, FILE_TOO_LARGE)
            out.write(chunk)
        out.truncate()


def save_upload_to_temp(file: UploadFile, suffix: str) -> Path:
    """Write the upload to a new temporary file the caller owns.

    On any failure (too large, read, write, flush or close) the file is removed quietly before the
    original error propagates.
    """
    path = new_temp_path(suffix)
    try:
        write_upload(file, path)
    except BaseException:
        remove_quietly(path)
        raise
    return path


def validate_upload_payload(path: Path, suffix: str) -> None:
    """Reject files whose content isn't a readable scorecard image or PDF within the limits."""
    if suffix == ".pdf":
        try:
            with open(path, "rb") as fh:
                if fh.read(5) != b"%PDF-":
                    raise ValueError("missing PDF header")
            if len(PdfReader(path).pages) < 1:
                raise ValueError("no pages")
        except Exception as exc:  # noqa: BLE001 - any parse failure is an invalid upload
            raise HTTPException(400, INVALID_PDF) from exc
        return

    try:
        with Image.open(path) as img:
            img.verify()
        with Image.open(path) as img:
            fmt = (img.format or "").upper()
            if fmt not in ALLOWED_IMAGE_FORMATS:
                raise HTTPException(400, UNSUPPORTED_IMAGE_FORMAT.format(format=fmt or "unknown"))
            width, height = img.size
            if width <= 0 or height <= 0:
                raise HTTPException(400, INVALID_IMAGE_DIMENSIONS)
            if width > MAX_IMAGE_SIDE or height > MAX_IMAGE_SIDE:
                raise HTTPException(400, IMAGE_DIMENSIONS_TOO_LARGE)
            if width * height > MAX_IMAGE_PIXELS:
                raise HTTPException(400, IMAGE_PIXELS_TOO_MANY)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        if suffix == ".heic" and not HEIC_DECODE_AVAILABLE:
            raise HTTPException(400, HEIC_UNAVAILABLE) from exc
        raise HTTPException(400, UNREADABLE_IMAGE) from exc


@dataclass(frozen=True)
class PreparedUpload:
    original_path: Path
    ocr_path: Path


@contextlib.asynccontextmanager
async def prepared_upload(file: UploadFile, *, for_ocr: bool) -> AsyncIterator[PreparedUpload]:
    """Validate an upload and, when ``for_ocr``, prepare the image OCR will receive.

    Name and content-type checks run first; writing, decoding and re-encoding run in a worker
    thread. Every temporary file is removed on exit, whatever the outcome.
    """
    suffix = check_upload_name(file)
    # Files are created only here, on the request's side, and every one is removed in `finally`.
    # Workers only write into them, so a worker outliving a cancelled request can't recreate one.
    original_path = ocr_output = None
    try:
        original_path = new_temp_path(suffix)
        if for_ocr:
            ocr_output = new_temp_path(".jpg")
        await run_in_threadpool(write_upload, file, original_path)
        await run_in_threadpool(validate_upload_payload, original_path, suffix)
        ocr_path = original_path
        if ocr_output is not None:
            ocr_path = await run_in_threadpool(prepare_for_ocr, original_path, ocr_output)
        yield PreparedUpload(original_path=original_path, ocr_path=ocr_path)
    finally:
        remove_quietly(original_path, ocr_output)
