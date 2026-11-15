"""Prepare a validated scorecard upload for OCR.

Images are sent as a JPEG with at most a 2,000 px long edge, quality 80 and no metadata: the
same format the frontend uploads, so a browser-prepared JPEG passes through untouched. PDFs and
anything this module can't decode go to OCR as uploaded.

Temporary files follow one rule: only the request creates files (``new_temp_path``, before any work
starts) and removes them (``remove_quietly``). Work in a worker thread only writes into those
existing files and never creates one (``open_existing``), so a worker still running after its
request was cancelled and cleaned up can't recreate a deleted path.
"""

import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Optional

from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

OCR_LONG_EDGE_TARGET = 2000
OCR_JPEG_QUALITY = 80

# Canvas-created JPEGs carry only ordinary JFIF/encoding information.
_SAFE_JPEG_INFO_KEYS = {"dpi", "jfif", "jfif_density", "jfif_unit", "jfif_version", "progression", "progressive"}


def new_temp_path(suffix: str) -> Path:
    """Create an empty temporary file and return its path; the caller owns and removes it."""
    fd, name = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    return Path(name)


def open_existing(path: Path):
    """Open a file the caller created, for rewriting. Fails if it was removed; never creates one."""
    return open(path, "r+b")


def remove_quietly(*paths: Optional[Path]) -> None:
    """Delete each file, logging (never raising) a failure, so cleanup can't change an outcome."""
    for path in dict.fromkeys(p for p in paths if p is not None):
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Could not remove temporary scan file %s", path.name, exc_info=True)


def is_ocr_ready_jpeg(path: Path, img: Image.Image) -> bool:
    """Return whether a browser-prepared JPEG can go to OCR unchanged."""
    if path.suffix.lower() not in {".jpg", ".jpeg"}:
        return False
    if img.format != "JPEG" or img.mode != "RGB":
        return False
    if max(img.size) > OCR_LONG_EDGE_TARGET:
        return False
    if img.getexif():
        return False
    # Re-encode anything carrying payload metadata before sending it onward.
    return not any(value for key, value in img.info.items() if key not in _SAFE_JPEG_INFO_KEYS)


def _save_jpeg(path: Path, img: Image.Image) -> None:
    with open_existing(path) as out:
        img.save(out, format="JPEG", quality=OCR_JPEG_QUALITY, optimize=True, progressive=True, exif=b"", icc_profile=None)
        out.truncate()


def prepare_for_ocr(path: Path, output_path: Path) -> Path:
    """Return the file to send to OCR: ``path`` itself, or ``output_path`` holding a new JPEG.

    ``path`` is returned for a browser-ready JPEG, a PDF, or any file that can't be decoded or
    re-encoded (for example HEIC without its decoder). The caller created ``output_path`` and
    removes it in every case; this function never creates or deletes a file.
    """
    if path.suffix.lower() == ".pdf":
        return path
    t0 = time.perf_counter()
    try:
        with Image.open(path) as img:
            if is_ocr_ready_jpeg(path, img):
                logger.info("OCR preprocess pass-through: format=JPEG size=%sx%s bytes=%s",
                            img.width, img.height, path.stat().st_size)
                return path
            # Honor EXIF orientation before re-encoding.
            img = ImageOps.exif_transpose(img)
            if img.mode != "RGB":
                img = img.convert("RGB")
            original_size = img.size
            # Resize large images before OCR (keep aspect ratio, do not upscale).
            width, height = img.size
            long_edge = max(width, height)
            if long_edge > OCR_LONG_EDGE_TARGET:
                scale = OCR_LONG_EDGE_TARGET / float(long_edge)
                img = img.resize((max(1, int(width * scale)), max(1, int(height * scale))), Image.Resampling.LANCZOS)
            # A fresh pixel-only image keeps EXIF/ICC/comment payloads out of the OCR input.
            stripped = Image.new("RGB", img.size)
            stripped.paste(img)
            _save_jpeg(output_path, stripped)
            logger.info(
                "OCR preprocess image: original=%sx%s resized_to=%sx%s in_bytes=%s out_bytes=%s total_ms=%.1f",
                original_size[0], original_size[1], stripped.size[0], stripped.size[1],
                path.stat().st_size, output_path.stat().st_size, (time.perf_counter() - t0) * 1000.0,
            )
            return output_path
    except Exception as exc:  # noqa: BLE001 - OCR can still read the original upload
        logger.warning("Image normalization failed; using original upload. file=%s err=%s", path.name, exc)
        return path
