from io import BytesIO
from contextlib import closing

import pypdfium2 as pdfium
import pytest
from PIL import Image

from services import scan_report_sanitizer as sanitizer
from services.scan_report_sanitizer import JPEG_HEADER_INFO_KEYS
from tests.scan_report_fixtures import IDENTIFIER, pdf_card, png_card


def mean_difference(a, b):
    return sum(abs(x - y) for x, y in zip(a.convert("RGB").tobytes(), b.convert("RGB").tobytes())) / (a.width * a.height * 3)


def test_png_removes_identifiers_and_keeps_the_card_nearly_identical():
    source = png_card() + b"trailing-" + IDENTIFIER.encode()
    clean, media_type = sanitizer.sanitize_scorecard(source, "image/png")
    assert media_type == "image/jpeg" and IDENTIFIER.encode() not in clean
    with Image.open(BytesIO(source)) as a, Image.open(BytesIO(clean)) as b:
        assert b.format == "JPEG" and a.size == b.size and mean_difference(a, b) < 2
        assert set(b.info) <= JPEG_HEADER_INFO_KEYS and not b.getexif()


def test_jpeg_orientation_is_applied_without_exif_gps_or_comments():
    output = BytesIO()
    exif = Image.Exif()
    exif[274] = 6
    exif[315] = IDENTIFIER
    exif[34853] = {1: "N", 2: (40.0, 1.0, 1.0)}
    with Image.new("RGB", (30, 10), "red") as source:
        source.save(output, "JPEG", exif=exif, comment=IDENTIFIER.encode())
    clean, _ = sanitizer.sanitize_scorecard(output.getvalue(), "image/jpeg")
    with Image.open(BytesIO(clean)) as result:
        assert result.size == (10, 30)
        assert result.getpixel((0, 0))[0] > 240
        assert not result.getexif() and set(result.info) <= JPEG_HEADER_INFO_KEYS
    assert IDENTIFIER.encode() not in clean


@pytest.mark.parametrize("fmt,media_type", [("WEBP", "image/webp"), ("HEIF", "image/heic")])
def test_other_supported_images_are_reencoded_without_metadata(fmt, media_type):
    from pillow_heif import register_heif_opener
    register_heif_opener()
    output = BytesIO()
    exif = Image.Exif()
    exif[315] = IDENTIFIER
    with Image.new("RGB", (20, 10), "white") as source:
        source.save(output, fmt, exif=exif)
    clean, actual_type = sanitizer.sanitize_scorecard(output.getvalue(), media_type)
    assert actual_type == "image/jpeg" and IDENTIFIER.encode() not in clean
    with Image.open(BytesIO(clean)) as image:
        assert image.size == (20, 10) and set(image.info) <= JPEG_HEADER_INFO_KEYS


def test_pdf_rebuild_removes_hidden_text_properties_attachments_and_xmp():
    source = pdf_card()
    clean, media_type = sanitizer.sanitize_scorecard(source, "application/pdf")
    assert media_type == "application/pdf"
    for marker in (IDENTIFIER.encode(), b"private-name", b"private!", b"/Author", b"/CreationDate", b"/Metadata", b"/EmbeddedFiles"):
        assert marker not in clean
    with pdfium.PdfDocument(source) as original, pdfium.PdfDocument(clean) as result:
        assert len(result) == len(original) == 2
        for index in range(len(result)):
            with closing(original[index]) as a, closing(result[index]) as b, closing(b.get_textpage()) as text:
                assert a.get_size() == b.get_size() == (180, 90)
                assert text.get_text_range() == ""
                with closing(a.render(scale=1)) as x, closing(b.render(scale=1)) as y:
                    ax, by = x.to_pil().convert("L"), y.to_pil().convert("L")
                    assert sum(abs(left - right) for left, right in zip(ax.tobytes(), by.tobytes())) / (180 * 90) < 3
                    assert min(by.tobytes()) < 20
    clean_again, _ = sanitizer.sanitize_scorecard(source, "application/pdf")
    assert clean == clean_again
    assert b"/ID" not in clean


@pytest.mark.parametrize("contents,media_type", [(b"bad", "image/png"), (b"%PDF-bad", "application/pdf"), (png_card(), "image/jpeg"), (png_card(), "text/plain")])
def test_invalid_files_fail_closed_with_safe_error(contents, media_type):
    with pytest.raises(sanitizer.ReportSanitizationError, match="Unable to sanitize"):
        sanitizer.sanitize_scorecard(contents, media_type)


def test_image_and_output_limits_fail_closed(monkeypatch):
    monkeypatch.setattr(sanitizer, "MAX_PIXELS", 10)
    with pytest.raises(sanitizer.ReportSanitizationError):
        sanitizer.sanitize_scorecard(png_card(), "image/png")
    monkeypatch.setattr(sanitizer, "MAX_PIXELS", 40_000_000)
    monkeypatch.setattr(sanitizer, "MAX_SANITIZED_BYTES", 10)
    with pytest.raises(sanitizer.ReportSanitizationError):
        sanitizer.sanitize_scorecard(png_card(), "image/png")


def test_pdf_page_and_pixel_limits(monkeypatch):
    with pytest.raises(sanitizer.ReportSanitizationError):
        sanitizer.sanitize_scorecard(pdf_card(pages=11), "application/pdf")
    monkeypatch.setattr(sanitizer, "MAX_PIXELS", 10)
    with pytest.raises(sanitizer.ReportSanitizationError):
        sanitizer.sanitize_scorecard(pdf_card(), "application/pdf")


def test_animated_image_is_rejected():
    output = BytesIO()
    with Image.new("RGB", (20, 10), "white") as a, Image.new("RGB", (20, 10), "black") as b:
        a.save(output, "PNG", save_all=True, append_images=[b])
    with pytest.raises(sanitizer.ReportSanitizationError):
        sanitizer.sanitize_scorecard(output.getvalue(), "image/png")


def test_password_protected_pdf_is_rejected():
    from pypdf import PdfReader, PdfWriter
    writer = PdfWriter()
    writer.add_page(PdfReader(BytesIO(pdf_card())).pages[0])
    writer.encrypt("private-password")
    output = BytesIO()
    writer.write(output)
    with pytest.raises(sanitizer.ReportSanitizationError):
        sanitizer.sanitize_scorecard(output.getvalue(), "application/pdf")


def test_phone_photo_is_stored_at_the_scanners_size_without_location():
    output = BytesIO()
    exif = Image.Exif()
    exif[315] = IDENTIFIER
    exif[34853] = {1: "N", 2: (40.0, 1.0, 1.0)}
    with Image.effect_noise((4032, 3024), 40).convert("RGB") as photo:
        photo.save(output, "JPEG", quality=92, exif=exif)
    source = output.getvalue()
    clean, media_type = sanitizer.sanitize_scorecard(source, "image/jpeg")
    assert media_type == "image/jpeg" and IDENTIFIER.encode() not in clean
    with Image.open(BytesIO(clean)) as image:
        assert image.format == "JPEG" and image.size == (2000, 1500)
        assert not image.getexif() and set(image.info) <= JPEG_HEADER_INFO_KEYS
    assert len(clean) < len(source) / 2


def test_transparent_areas_become_white_paper():
    output = BytesIO()
    with Image.new("RGBA", (20, 10), (0, 0, 0, 0)) as card:
        card.putpixel((1, 1), (0, 100, 0, 255))
        card.save(output, "PNG")
    clean, _ = sanitizer.sanitize_scorecard(output.getvalue(), "image/png")
    with Image.open(BytesIO(clean)) as image:
        assert image.mode == "RGB" and min(image.getpixel((15, 8))) > 245
