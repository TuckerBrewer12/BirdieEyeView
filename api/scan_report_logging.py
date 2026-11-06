"""Suppress Uvicorn request records for anonymous reports, including queries."""

import logging
from urllib.parse import unquote, urlsplit

from api.scan_report_schemas import REPORT_PATH


class AnonymousReportAccessFilter(logging.Filter):
    def filter(self, record):
        # Uvicorn access records: client address, method, request target, HTTP version, status.
        if isinstance(record.args, tuple) and len(record.args) == 5:
            path = unquote(urlsplit(str(record.args[2])).path).rstrip("/")
            if path == REPORT_PATH:
                return False
        return True


def protect_report_access_logs():
    logger = logging.getLogger("uvicorn.access")
    if not any(isinstance(item, AnonymousReportAccessFilter) for item in logger.filters):
        logger.addFilter(AnonymousReportAccessFilter())
