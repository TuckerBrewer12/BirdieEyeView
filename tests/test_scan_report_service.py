from uuid import uuid4

import pytest

from services.scan_report_service import (
    AnonymousScanReport, ReportNotSaved, ReportStorageUnavailable, submit_scan_report,
)


def report():
    return AnonymousScanReport(
        image=b"scorecard", media_type="image/png", retry_key=uuid4(),
        category="network_error", stage="unknown", http_status=None,
    )


@pytest.mark.asyncio
async def test_absent_storage_is_explicitly_unavailable():
    with pytest.raises(ReportStorageUnavailable):
        await submit_scan_report(report(), None)


@pytest.mark.asyncio
@pytest.mark.parametrize("acknowledgement", [None, False, "saved", 1])
async def test_saving_requires_explicit_durable_acknowledgement(acknowledgement):
    class UnconfirmedStore:
        async def save(self, report):
            return acknowledgement

    with pytest.raises(ReportNotSaved):
        await submit_scan_report(report(), UnconfirmedStore())
