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

_SAFE_JPEG_INFO_KEYS = {"dpi", "jfif", "jfif_density", "jfif_unit", "jfif_version", "progression", "progressive"}


def new_temp_path(suffix: str) -> Path:
    fd, name = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    return Path(name)


def open_existing(path: Path):
    return open(path, "r+b")


def remove_quietly(*paths: Optional[Path]) -> None:
    for path in dict.fromkeys(p for p in paths if p is not None):
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Could not remove temporary scan file %s", path.name, exc_info=True)


def is_ocr_ready_jpeg(path: Path, img: Image.Image) -> bool:
    if path.suffix.lower() not in {".jpg", ".jpeg"}:
        return False
    if img.format != "JPEG" or img.mode != "RGB":
        return False
    if max(img.size) > OCR_LONG_EDGE_TARGET:
        return False
    if img.getexif():
        return False
    return not any(value for key, value in img.info.items() if key not in _SAFE_JPEG_INFO_KEYS)


def _save_jpeg(path: Path, img: Image.Image) -> None:
    with open_existing(path) as out:
        img.save(out, format="JPEG", quality=OCR_JPEG_QUALITY, optimize=True, progressive=True, exif=b"", icc_profile=None)
        out.truncate()


def prepare_for_ocr(path: Path, output_path: Path) -> Path:
    if path.suffix.lower() == ".pdf":
        return path
    t0 = time.perf_counter()
    try:
        with Image.open(path) as img:
            if is_ocr_ready_jpeg(path, img):
                logger.info("OCR preprocess pass-through: format=JPEG size=%sx%s bytes=%s",
                            img.width, img.height, path.stat().st_size)
                return path
            img = ImageOps.exif_transpose(img)
            if img.mode != "RGB":
                img = img.convert("RGB")
            original_size = img.size
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
