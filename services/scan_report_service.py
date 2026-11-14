from dataclasses import dataclass, field
from typing import Literal, Protocol
from uuid import UUID


FailureCategory = Literal[
    "unreadable_scores", "invalid_upload", "service_unavailable", "extraction_failed",
    "http_error", "network_error", "invalid_response",
]
FailureStage = Literal["upload", "ocr", "parse", "assembly", "unknown"]


@dataclass(frozen=True)
class AnonymousScanReport:
    image: bytes = field(repr=False)
    media_type: str
    retry_key: UUID
    category: FailureCategory
    stage: FailureStage
    http_status: int | None
    schema_version: int = 1


class ScanReportStore(Protocol):
    async def save(self, report: AnonymousScanReport) -> bool:
        ...


class ReportStorageUnavailable(Exception):
    pass


class ReportNotSaved(Exception):
    pass


async def submit_scan_report(report: AnonymousScanReport, store: ScanReportStore | None) -> None:
    if store is None:
        raise ReportStorageUnavailable
    try:
        saved = await store.save(report)
    except Exception:  # noqa: BLE001
        raise ReportNotSaved from None
    if saved is not True:
        raise ReportNotSaved
