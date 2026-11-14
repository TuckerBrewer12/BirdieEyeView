from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, UUID4

from services.scan_report_service import FailureCategory, FailureStage

REPORT_PATH = "/api/scan/reports"


class ScanReportMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal[1]
    retry_key: UUID4
    category: FailureCategory
    stage: FailureStage = "unknown"
    http_status: int | None = Field(default=None, ge=100, le=599, strict=True)


class ScanReportResponse(BaseModel):
    status: Literal["saved"]


ReportErrorCode = Literal["report_storage_unavailable", "report_not_saved"]


class ScanReportErrorResponse(BaseModel):
    code: ReportErrorCode
    detail: str | None = None
