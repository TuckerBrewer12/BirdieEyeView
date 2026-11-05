"""Upload validation, temporary-file ownership and OCR image preparation for the scan routes.

The real app can't make a disk read, an image encode or a file deletion fail, so those failure
paths are tested here; everything reachable over HTTP is covered in tests/integration/test_api_e2e.py.
"""

import asyncio
import builtins
import contextlib
import threading
from io import BytesIO
from pathlib import Path

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

from api import scan_uploads
from services import scan_image
from tests.scan_report_fixtures import pdf_card


def make_upload(name: str, content_type: str, data: bytes = b"data") -> UploadFile:
    return UploadFile(file=BytesIO(data), filename=name, headers=Headers({"content-type": content_type}))


def png_bytes(size=(20, 10)) -> bytes:
    output = BytesIO()
    Image.new("RGB", size, "white").save(output, format="PNG")
    return output.getvalue()


# ================================================================
# Name, content and size checks
# ================================================================


def test_upload_suffix_normalizes_extension():
    assert scan_uploads.check_upload_name(make_upload("card.JPG", "image/jpeg")) == ".jpg"


@pytest.mark.parametrize(
    ("upload", "message"),
    [
        (make_upload("", "image/jpeg"), "Filename is required"),
        (make_upload("card.exe", "application/octet-stream"), "Unsupported file type"),
        (make_upload("card.jpg", "text/plain"), "Unsupported upload content type"),
    ],
)
def test_upload_suffix_rejects_invalid_upload(upload, message):
    with pytest.raises(HTTPException, match=message):
        scan_uploads.check_upload_name(upload)


def test_validate_pdf_upload(tmp_path):
    path = tmp_path / "card.pdf"
    path.write_bytes(pdf_card(pages=1))

    scan_uploads.validate_upload_payload(path, ".pdf")


@pytest.mark.parametrize("contents", [b"wrong", b"%PDF-but nothing after the header is a PDF"])
def test_validate_pdf_upload_rejects_unparseable_document(tmp_path, contents):
    path = tmp_path / "bad.pdf"
    path.write_bytes(contents)

    with pytest.raises(HTTPException, match="Invalid PDF"):
        scan_uploads.validate_upload_payload(path, ".pdf")


def test_validate_image_upload(tmp_path):
    path = tmp_path / "card.png"
    path.write_bytes(png_bytes())

    scan_uploads.validate_upload_payload(path, ".png")


def test_validate_image_upload_rejects_unreadable_file(tmp_path):
    path = tmp_path / "bad.png"
    path.write_bytes(b"not-an-image")

    with pytest.raises(HTTPException, match="Invalid or unreadable"):
        scan_uploads.validate_upload_payload(path, ".png")


def test_save_upload_streams_content_to_temp_file():
    saved_path = scan_uploads.save_upload_to_temp(make_upload("card.png", "image/png", b"abc"), ".png")
    try:
        assert saved_path.read_bytes() == b"abc"
    finally:
        saved_path.unlink(missing_ok=True)


def test_save_upload_enforces_size_limit_and_removes_the_partial_file(monkeypatch, tmp_path):
    monkeypatch.setattr(scan_uploads, "MAX_UPLOAD_BYTES", 3)
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))

    with pytest.raises(HTTPException) as raised:
        scan_uploads.save_upload_to_temp(make_upload("large.png", "image/png", b"abcd"), ".png")

    assert raised.value.status_code == 413
    assert list(tmp_path.iterdir()) == []


def test_save_upload_removes_its_file_when_reading_fails(monkeypatch, tmp_path):
    class FailingStream(BytesIO):
        def read(self, size=-1):
            if self.tell():
                raise OSError("connection reset")
            return super().read(2)

    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    upload = UploadFile(file=FailingStream(b"abcdef"), filename="card.png", headers=Headers({"content-type": "image/png"}))

    with pytest.raises(OSError, match="connection reset"):
        scan_uploads.save_upload_to_temp(upload, ".png")

    assert list(tmp_path.iterdir()) == []


# ================================================================
# OCR image preparation
# ================================================================


def test_image_preparation_resizes_and_converts_at_ui_quality(tmp_path):
    source = tmp_path / "large.png"
    Image.new("RGBA", (2400, 1200), (255, 255, 255, 128)).save(source)

    output = tmp_path / "ocr.jpg"
    output.touch()  # the caller creates the output file; prepare_for_ocr only writes into it
    assert scan_image.prepare_for_ocr(source, output) == output
    with Image.open(output) as result:
        assert (result.mode, max(result.size), result.format) == ("RGB", scan_image.OCR_LONG_EDGE_TARGET, "JPEG")
    assert (scan_image.OCR_LONG_EDGE_TARGET, scan_image.OCR_JPEG_QUALITY) == (2000, 80)


def test_image_preparation_passes_through_ready_jpeg(tmp_path):
    source = tmp_path / "prepared.jpg"
    Image.new("RGB", (2000, 1200), "white").save(source, format="JPEG", quality=80)
    original_bytes = source.read_bytes()

    assert scan_image.prepare_for_ocr(source, tmp_path / "ocr.jpg") == source
    assert source.read_bytes() == original_bytes


def test_image_preparation_reencodes_metadata_bearing_jpeg(tmp_path):
    source = tmp_path / "metadata.jpg"
    exif = Image.Exif()
    exif[274] = 1
    Image.new("RGB", (1200, 800), "white").save(source, format="JPEG", quality=80, exif=exif)

    output = tmp_path / "ocr.jpg"
    output.touch()  # the caller creates the output file; prepare_for_ocr only writes into it
    assert scan_image.prepare_for_ocr(source, output) == output
    with Image.open(output) as result:
        assert not result.getexif()


def test_image_preparation_falls_back_for_unreadable_image_and_pdf(tmp_path):
    bad, pdf = tmp_path / "bad.jpg", tmp_path / "card.pdf"
    bad.write_bytes(b"bad")
    pdf.write_bytes(pdf_card(pages=1))

    assert scan_image.prepare_for_ocr(bad, tmp_path / "ocr.jpg") == bad
    assert scan_image.prepare_for_ocr(pdf, tmp_path / "ocr.jpg") == pdf  # PDFs go to OCR as uploaded


def test_failed_reencode_falls_back_to_the_original(monkeypatch, tmp_path):
    source = tmp_path / "large.png"
    Image.new("RGB", (2400, 1200), "white").save(source)

    def failing_save(path, img):
        Path(path).write_bytes(b"partial")
        raise OSError("disk full")

    monkeypatch.setattr(scan_image, "_save_jpeg", failing_save)

    # The caller owns the output path and removes it; OCR gets the original upload.
    assert scan_image.prepare_for_ocr(source, tmp_path / "ocr.jpg") == source


# ================================================================
# prepared_upload: cleanup never changes the outcome
# ================================================================


@pytest.mark.asyncio
async def test_cleanup_failure_never_replaces_the_requests_own_error(monkeypatch, tmp_path, caplog):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    real_unlink = Path.unlink
    attempted = []

    def unlink(path, missing_ok=False):
        attempted.append(path)
        if len(attempted) == 1:
            raise PermissionError("locked")
        return real_unlink(path, missing_ok=missing_ok)

    upload = make_upload("card.png", "image/png", png_bytes((2400, 1200)))
    with pytest.raises(RuntimeError, match="the request's own failure"):
        async with scan_uploads.prepared_upload(upload, for_ocr=True) as prepared:
            assert prepared.ocr_path != prepared.original_path  # two files to clean up
            monkeypatch.setattr(Path, "unlink", unlink)
            raise RuntimeError("the request's own failure")

    assert len(attempted) == 2  # the second file is still removed after the first fails
    assert [p.name for p in tmp_path.iterdir()] == [attempted[0].name]
    assert "Could not remove temporary scan file" in caplog.text



@pytest.mark.asyncio
async def test_a_failed_reencode_leaves_no_temp_files(monkeypatch, tmp_path):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    monkeypatch.setattr(scan_image, "_save_jpeg", lambda path, img: (Path(path).write_bytes(b"partial"), 1 / 0))

    upload = make_upload("card.png", "image/png", png_bytes((2400, 1200)))
    async with scan_uploads.prepared_upload(upload, for_ocr=True) as prepared:
        assert prepared.ocr_path == prepared.original_path  # fell back to the original upload

    assert list(tmp_path.iterdir()) == []


# Pause the worker just before it writes: while writing the upload, and after decoding the image
# but before saving the OCR JPEG.
@pytest.mark.parametrize("module,stage", [(scan_uploads, "write_upload"), (scan_image, "_save_jpeg")])
@pytest.mark.asyncio
async def test_cancelling_a_request_mid_work_leaves_no_file_after_the_worker_finishes(monkeypatch, tmp_path, module, stage):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    started, release, finished = threading.Event(), threading.Event(), threading.Event()
    real = getattr(module, stage)

    def slow(*args):
        started.set()
        release.wait(5)
        try:
            return real(*args)
        finally:
            finished.set()

    monkeypatch.setattr(module, stage, slow)

    async def scan():
        upload = make_upload("card.png", "image/png", png_bytes((2400, 1200)))  # re-encoded, so both stages run
        async with scan_uploads.prepared_upload(upload, for_ocr=True):
            pass

    task = asyncio.create_task(scan())
    await asyncio.to_thread(started.wait, 5)
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await asyncio.wait_for(asyncio.shield(task), 0.2)  # cancellation reaches cleanup while the worker waits
    release.set()  # only now does the worker do its file work
    with pytest.raises(asyncio.CancelledError):
        await task
    await asyncio.to_thread(finished.wait, 5)  # check after the worker is completely done
    assert list(tmp_path.iterdir()) == []


@pytest.mark.asyncio
async def test_failing_to_create_the_second_temp_file_removes_the_first(monkeypatch, tmp_path):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    real_new = scan_uploads.new_temp_path
    created = []

    def second_fails(suffix):
        if created:
            raise OSError("too many open files")
        created.append(real_new(suffix))
        return created[-1]

    monkeypatch.setattr(scan_uploads, "new_temp_path", second_fails)

    with pytest.raises(OSError, match="too many open files"):
        async with scan_uploads.prepared_upload(make_upload("card.png", "image/png", png_bytes()), for_ocr=True):
            pass
    assert list(tmp_path.iterdir()) == []


def test_a_failing_close_removes_the_upload(monkeypatch, tmp_path):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    real_open = builtins.open

    class FailsOnClose:
        """A real file whose buffered data fails to flush when it is closed."""

        def __init__(self, handle):
            self.handle = handle

        def write(self, data):
            return self.handle.write(data)

        def truncate(self, *args):
            return self.handle.truncate(*args)

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            self.handle.close()
            raise OSError("no space left on device")

    monkeypatch.setattr(builtins, "open", lambda path, mode="r", *a, **k: (
        FailsOnClose(real_open(path, mode, *a, **k)) if mode == "r+b" else real_open(path, mode, *a, **k)))

    with pytest.raises(OSError, match="no space left"):
        scan_uploads.save_upload_to_temp(make_upload("card.png", "image/png", b"abc"), ".png")

    monkeypatch.setattr(builtins, "open", real_open)
    assert list(tmp_path.iterdir()) == []


def test_a_failing_cleanup_keeps_the_413(monkeypatch, tmp_path, caplog):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    monkeypatch.setattr(scan_uploads, "MAX_UPLOAD_BYTES", 3)

    def locked(self, missing_ok=False):
        raise PermissionError("locked")

    monkeypatch.setattr(Path, "unlink", locked)

    with pytest.raises(HTTPException) as raised:
        scan_uploads.save_upload_to_temp(make_upload("large.png", "image/png", b"abcd"), ".png")

    assert raised.value.status_code == 413  # not the PermissionError from cleanup
    assert "Could not remove temporary scan file" in caplog.text
