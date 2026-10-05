"""Fail-closed removal of embedded data; visible scorecard content is retained."""

import math
import threading
from contextlib import closing
from io import BytesIO

from PIL import Image, ImageOps
from pypdf import PdfReader, PdfWriter
import pypdfium2 as pdfium
import pypdfium2.raw as pdfium_c

MAX_SOURCE_BYTES = 20 * 1024 * 1024
MAX_SANITIZED_BYTES = 32 * 1024 * 1024
MAX_PIXELS = 40_000_000
MAX_SIDE = 12_000
MAX_PDF_PAGES = 10
PDF_DPI = 200
# PDFium is not thread-safe, even when each thread uses a different document.
PDF_LOCK = threading.Lock()
IMAGE_FORMATS = {"image/jpeg": {"JPEG"}, "image/png": {"PNG"},
                 "image/webp": {"WEBP"}, "image/heic": {"HEIF", "HEIC"}}


class ReportSanitizationError(ValueError):
    pass


class BoundedOutput(BytesIO):
    def write(self, data):
        if self.tell() + len(data) > MAX_SANITIZED_BYTES:
            raise ReportSanitizationError("Sanitized scorecard exceeds the size limit.")
        return super().write(data)


def _check_dimensions(width, height):
    if not (0 < width <= MAX_SIDE and 0 < height <= MAX_SIDE and width * height <= MAX_PIXELS):
        raise ReportSanitizationError("Scorecard dimensions exceed the limit.")


def _sanitize_image(data: bytes, media_type: str) -> bytes:
    if media_type == "image/heic":
        from pillow_heif import register_heif_opener
        register_heif_opener()
    with Image.open(BytesIO(data)) as source:
        if source.format not in IMAGE_FORMATS[media_type] or getattr(source, "n_frames", 1) != 1:
            raise ReportSanitizationError("Unsupported image format or frame count.")
        _check_dimensions(*source.size)
        oriented = ImageOps.exif_transpose(source)
        try:
            mode = "RGBA" if "A" in oriented.getbands() or "transparency" in oriented.info else "RGB"
            with oriented.convert(mode) as pixels:
                # Construct a new image rather than saving a copy carrying .info.
                with Image.frombytes(mode, pixels.size, pixels.tobytes()) as clean:
                    with BoundedOutput() as output:
                        clean.save(output, format="PNG")
                        return output.getvalue()
        finally:
            oriented.close()


def _sanitize_pdf(data: bytes) -> bytes:
    with PDF_LOCK, pdfium.PdfDocument(data) as source, pdfium.PdfDocument.new() as clean:
        if pdfium_c.FPDF_GetSecurityHandlerRevision(source) >= 0:
            raise ReportSanitizationError("Encrypted documents cannot be reported.")
        if not 0 < len(source) <= MAX_PDF_PAGES:
            raise ReportSanitizationError("Scorecard page count exceeds the limit.")
        source.init_forms()
        total_pixels = 0
        for index in range(len(source)):
            with closing(source[index]) as page:
                width, height = page.get_size()
                if not (math.isfinite(width) and math.isfinite(height)):
                    raise ReportSanitizationError("Invalid page dimensions.")
                pixel_width, pixel_height = math.ceil(width * PDF_DPI / 72), math.ceil(height * PDF_DPI / 72)
                _check_dimensions(pixel_width, pixel_height)
                total_pixels += pixel_width * pixel_height
                if total_pixels > MAX_PIXELS:
                    raise ReportSanitizationError("Scorecard pixel count exceeds the limit.")
                # Includes visible annotations/forms, with scripts never executed.
                with closing(page.render(scale=PDF_DPI / 72, draw_annots=True)) as bitmap, closing(clean.new_page(width, height)) as target:
                    image = pdfium.PdfImage.new(clean)
                    try:
                        image.set_bitmap(bitmap)
                        image.set_matrix(pdfium.PdfMatrix(width, 0, 0, height, 0, 0))
                        target.insert_obj(image)
                        target.gen_content()
                    except Exception:
                        image.close()
                        raise
        with BoundedOutput() as output:
            clean.save(output)
            # Only read our fresh raster PDF, never the submitted document.
            reader = PdfReader(BytesIO(output.getvalue()))
            writer = PdfWriter()
            for page in reader.pages:
                writer.add_page(page)
            writer.metadata = None
            with BoundedOutput() as final:
                writer.write(final)
                return final.getvalue()


def sanitize_scorecard(data: bytes, media_type: str) -> tuple[bytes, str]:
    """No source metadata/objects/trailing bytes survive into the output."""
    try:
        if not data or len(data) > MAX_SOURCE_BYTES:
            raise ReportSanitizationError("Scorecard size exceeds the limit.")
        if media_type == "application/pdf":
            return _sanitize_pdf(data), media_type
        if media_type not in IMAGE_FORMATS:
            raise ReportSanitizationError("Unsupported scorecard media type.")
        return _sanitize_image(data, media_type), "image/png"
    except Exception:
        # Decoder exceptions may contain embedded identifiers; never propagate them.
        raise ReportSanitizationError("Unable to sanitize this scorecard.") from None

