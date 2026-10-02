# Failed scan reporting

The signed-in scan page and public scanner share a Report failed scan control.
It submits only after a click. Replacing the file or starting a new scan clears
the old report state. A report retry keeps its independent retry key.

## Current delivery boundary

No durable report store is configured. `POST /api/scan/reports` returns 503 with
`code: report_storage_unavailable`; the UI explicitly says the report was not
saved. There is no production memory queue, filesystem archive, database table,
or provider-backed retry. A successful path is tested with fakes only.

To connect storage later, implement `ScanReportStore` in
`services/scan_report_service.py` and override
`api.routers.scan_reports.get_scan_report_store` at application setup. The
adapter must return `True` only after durable storage succeeds or after finding
the same retry key already durably saved. A report-storage failure must never
affect scanning or round saving.

## Anonymous submission contract

The request contains two multipart fields:

- `file`: the failed attempt's upload, using a generic `scorecard` filename.
- `metadata`: JSON containing `schema_version`, `retry_key`, `category`, `stage`,
  and optional `http_status`.

The client omits credentials, authorization headers, and referrer. The endpoint
does not resolve a user or read the application database. It rejects extra
metadata and multipart fields. Report records have no account, session, course,
round, device, IP, user-agent, original filename, original scan timestamp, or
scan-log correlation ID. Raw OCR, hints, and free-text error messages are not
included. Categories supplied by clients are diagnostic claims, not trusted
proof of a server failure.

Visible names on scorecards are intentionally allowed. The file may still
contain embedded metadata, so a future adapter must strip identifying metadata
before persistence while preserving visible content. That sanitation is not
implemented by the unconfigured adapter in this phase. Retrying the upload
also cannot reproduce private course context or free-text hints omitted from
the report.

The application avoids IP/user-agent/exception-detail logging for this report
route and excludes it from the traffic monitor. Limits still use process-local
IP counters, separately from report payloads. The default report limit is ten
requests per scan-limit window, configurable through
`API_SCAN_REPORT_LIMIT_MAX_REQUESTS`; it is separate from OCR/extraction limits.
The existing global API limits also apply.

Before enabling collection, configure private storage, encryption at rest,
retention/deletion, and developer retrieval. Review reverse-proxy, hosting,
access-log and telemetry settings: application code does not make reports
untraceable to network operators. Serve production requests over HTTPS.
Encryption does not replace removing account identifiers.

## Frontend integration

- `ReportFailedScan` is a presentational component using the existing brand Button.
- `useFailedScanReport` holds submission state and accepts a repository.
- `scanReportRepository` owns anonymous multipart transport.
- `useScan` and `usePublicScan` capture the failed attempt; each UI renders the
  same reporting component.

This branch remains based on main. Tucker's unmerged frontend refactor moves
the public scan UI into `pages/landing-page/sections/TryItYourselfSection.tsx`
and exposes its state through `useTryItYourselfViewModel`. When combining the
branches, pass through `report` from `usePublicScan` and render the shared report
component there. Its brand Button uses the `secondary` variant supported by
both branches. No new hardcoded colors or theme-reading logic are needed.

## Focused verification

```bash
.venv/bin/python -m pytest -q tests/test_scan_report_routes.py tests/test_scan_report_service.py tests/test_scan_router_helpers.py tests/test_api_main.py
cd frontend
npm test -- src/data/scanReportRepository.test.ts src/hooks/tests/useFailedScanReport.test.tsx src/hooks/tests/scanFailureLifecycle.test.tsx
npm run test:screenshots -- src/components/scan/tests/ScanReport.screenshot.spec.ts --workers=1
```

The browser tests use a named stateful fake backend and a screen robot. They
exercise both scan entrypoints, retry, pending/saved/unavailable states, and
credential omission at desktop/mobile sizes in light/dark modes. Screenshots
are attached for visual review, not compared to committed baselines. No live
OCR or database is contacted.
