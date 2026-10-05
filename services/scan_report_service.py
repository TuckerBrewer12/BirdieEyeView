"""Anonymous scan-report submission with a replaceable durable-storage boundary."""

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
    """Client-reported diagnostics, not proof of the cause of a server failure.

    Intentionally has no user, filename, request ID, timestamp, IP, or free text.
    The retry key belongs only to reporting; it must never join to scan logs.
    """

    image: bytes = field(repr=False)
    media_type: str
    retry_key: UUID
    category: FailureCategory
    stage: FailureStage
    http_status: int | None
    schema_version: int = 1


class ScanReportStore(Protocol):
    async def save(self, report: AnonymousScanReport) -> bool:
        """Confirm durable storage (including an already-saved retry key).

        Before enabling an adapter, strip embedded identifying file metadata,
        configure private encrypted storage, and review deployment access logs.
        Do not persist request credentials/identity or log report keys or bytes.
        """
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
    except Exception:
        # Store exceptions may include object keys, credentials or image metadata.
        raise ReportNotSaved from None
    if saved is not True:
        raise ReportNotSaved
