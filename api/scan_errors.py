"""Safe scan failure categories, separate from internal exception details."""

from fastapi import HTTPException

from services.scan_report_service import FailureCategory, FailureStage


class ScanExtractionError(HTTPException):
    def __init__(self, status_code: int, detail: str, *, category: FailureCategory, stage: FailureStage):
        super().__init__(status_code=status_code, detail=detail)
        self.failure = {"category": category, "stage": stage}
