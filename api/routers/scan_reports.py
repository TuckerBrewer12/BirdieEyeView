"""Reporting is anonymous even when called from the signed-in scan screen."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from api.messages import (
    FILE_TOO_LARGE, REPORT_FIELDS_NOT_ALLOWED, REPORT_FILE_REJECTED, REPORT_FILE_TYPE_UNSUPPORTED,
    REPORT_METADATA_INVALID,
)
from api.error_responses import REPORT_NOT_SAVED, REPORT_STORAGE_UNAVAILABLE
from api.scan_uploads import (
    MAX_UPLOAD_BYTES, check_upload_name, remove_quietly, save_upload_to_temp, validate_upload_payload,
)
from api.scan_report_schemas import ScanReportMetadata
from services.scan_report_service import (
    AnonymousScanReport,
    ReportNotSaved,
    ReportStorageUnavailable,
    ScanReportStore,
    submit_scan_report,
)

router = APIRouter()


def get_scan_report_store() -> ScanReportStore | None:
    """Application setup overrides this when private durable storage is configured."""
    return None


def _validated_image(file: UploadFile) -> tuple[bytes, str]:
    suffix = check_upload_name(file)
    path = save_upload_to_temp(file, suffix)
    try:
        validate_upload_payload(path, suffix)
        media_type = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
            ".webp": "image/webp", ".heic": "image/heic", ".pdf": "application/pdf",
        }[suffix]
        return path.read_bytes(), media_type
    finally:
        remove_quietly(path)


@router.post("/reports")
async def report_failed_scan(
    request: Request,
    file: UploadFile = File(...),
    metadata: str = Form(...),
    store: ScanReportStore | None = Depends(get_scan_report_store),
):
    form = await request.form()
    if sorted(key for key, _ in form.multi_items()) != ["file", "metadata"]:
        raise HTTPException(422, REPORT_FIELDS_NOT_ALLOWED)
    if len(metadata) > 2048:
        raise HTTPException(422, REPORT_METADATA_INVALID)
    try:
        values = ScanReportMetadata.model_validate_json(metadata)
    except ValidationError:
        # Pydantic errors include input values; never echo submitted identity fields.
        raise HTTPException(422, REPORT_METADATA_INVALID) from None

    if file.size is not None and file.size > MAX_UPLOAD_BYTES:
        raise HTTPException(413, FILE_TOO_LARGE)
    try:
        check_upload_name(file)
    except HTTPException:
        raise HTTPException(400, REPORT_FILE_TYPE_UNSUPPORTED) from None

    # Do not read/copy the image when nothing can store it. UploadFile is closed
    # by FastAPI after the request; there is no temporary report archive.
    if store is None:
        return JSONResponse(
            status_code=503,
            content={"code": "report_storage_unavailable", "detail": REPORT_STORAGE_UNAVAILABLE},
        )

    try:
        image, media_type = await run_in_threadpool(_validated_image, file)
    except HTTPException as exc:
        raise HTTPException(exc.status_code, REPORT_FILE_REJECTED) from None

    report = AnonymousScanReport(image=image, media_type=media_type, **values.model_dump())
    try:
        await submit_scan_report(report, store)
    except ReportStorageUnavailable:
        return JSONResponse(status_code=503, content={"code": "report_storage_unavailable"})
    except ReportNotSaved:
        return JSONResponse(
            status_code=503,
            content={"code": "report_not_saved", "detail": REPORT_NOT_SAVED},
        )
    return {"status": "saved"}
