import logging

import pytest

from api.scan_report_logging import AnonymousReportAccessFilter, protect_report_access_logs


@pytest.mark.parametrize("target", ["/api/scan/reports", "/api/scan/reports/", "/api/scan/reports?account=private-user", "/api/scan/%72eports"])
def test_uvicorn_report_access_records_are_suppressed(target):
    record = logging.LogRecord("uvicorn.access", logging.INFO, "", 0, "%s %s %s %s %s",
                               ("private-ip", "POST", target, "1.1", 200), None)
    assert AnonymousReportAccessFilter().filter(record) is False


def test_other_access_records_remain_and_filter_installation_is_idempotent():
    record = logging.LogRecord("uvicorn.access", logging.INFO, "", 0, "%s %s %s %s %s",
                               ("address", "GET", "/api/health", "1.1", 200), None)
    assert AnonymousReportAccessFilter().filter(record) is True
    protect_report_access_logs()
    protect_report_access_logs()
    assert sum(isinstance(item, AnonymousReportAccessFilter) for item in logging.getLogger("uvicorn.access").filters) == 1
