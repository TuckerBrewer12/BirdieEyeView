# Failed scan reporting

The signed-in scan page and public scanner share a Report failed scan control.
It submits only after a click. Replacing the file or starting a new scan clears
the old report state. A report retry keeps its independent retry key.

## Durable storage and rollout

`services/scan_report_storage.py` implements `ScanReportStore` with private
S3-compatible storage and AES-256-GCM application encryption. Application setup
injects it only when `SCAN_REPORT_STORAGE_ENABLED=true` and all required settings
are valid. Missing/broken configuration leaves reporting unavailable without
preventing scanning, round saving, or API startup. No database is used.

Every upload is sanitized before encryption and persistence. One encrypted
object contains the cleaned file and allowlisted diagnostic JSON. Keys are
`reports/v1/<report-only-UUID4>.bev`, with no original filename, account, course,
or scan timestamp. Objects have a generic binary content type and no custom
metadata or public ACL. Each envelope uses a fresh nonce and authenticated
version header. The encryption key is separate from S3/application credentials.

Create-only conditional PUT prevents concurrent retries from overwriting a
report. A successful PUT or duplicate response is followed by a bounded GET and
authenticated decryption. The saved file and diagnostics must match the retry
before the API returns `saved`. Conflicting retries, corruption, unsupported
conditional writes and provider failures produce safe 503 responses. A retry
can recover a durable report whose previous acknowledgement was lost.

Collection is disabled by default. While disabled, `POST /api/scan/reports`
returns 503 with `code: report_storage_unavailable`; the UI says the report was
not saved. No memory queue or filesystem archive acknowledges discarded reports.

### Railway setup status — October 2, 2026

The connected Railway plugin configured eight dedicated backend variables with
deployments skipped: enabled state, bucket, endpoint, region, addressing style,
two S3 credentials and encryption key. The five bucket values use
`${{failed-scan-reports.<VARIABLE>}}` references; credentials were not exported.
Collection remains disabled.

Railway reports one pre-existing staged change, patch
`4d427b24-fddf-4ed3-bf71-5afdea3623b1`: `resource.update` on bucket
`685b6426-744d-42eb-b682-6acd8cb34b3a` (`failed-scan-reports`). The inspected
plugin tools expose no active bucket and do not expose the staged bucket region
or changed configuration fields. Bucket activation and real-storage smoke
verification are pending. Review current pending work before explicitly
approving environment deployment; it commits all staged changes.

The backend still deploys from `main`; these feature-branch changes have not
been pushed, merged or deployed. Activate and verify storage before rolling out
the code and enabling collection. Local/fake tests do not establish real Railway
persistence. Connected OAuth tools expose variable names rather than credential
values and cannot run the S3 smoke command directly. Obtain developer credentials
through the private Railway bucket Credentials page into an ignored local file.

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

Visible names on scorecards are intentionally allowed. The configured adapter
removes embedded metadata before persistence while preserving visible content.
Retrying the upload also cannot reproduce private course context or free-text hints omitted from
the report.

The application avoids IP/user-agent/exception-detail logging for this report
route and excludes it from the traffic monitor. Limits still use process-local
IP counters, separately from report payloads. The default report limit is ten
requests per scan-limit window, configurable through
`API_SCAN_REPORT_LIMIT_MAX_REQUESTS`; it is separate from OCR/extraction limits.
The existing global API limits also apply.

Uvicorn access logs suppress the report path, including query strings. Review
reverse-proxy, hosting, access-log and telemetry settings: Railway edge HTTP logs
cannot currently be excluded per path through the inspected tools. Application
anonymity does not mean anonymity from network operators. Serve production
requests and bucket access over HTTPS. Encryption does not replace removing
account identifiers.

## Metadata sanitation

`services/scan_report_sanitizer.py` decodes JPEG, PNG, WebP and supported HEIC,
applies EXIF orientation, and writes fresh PNG pixels. EXIF/GPS, XMP, comments,
ICC payloads and trailing bytes are not copied. Visible names are retained.
Multi-frame images are rejected rather than silently dropping frames. The
adapter never falls back to storing the original file.

PDFs are rendered at 200 DPI and rebuilt as fresh image-only documents, retaining
page order, dimensions, visible text, annotations and supported form appearance.
Source metadata, attachments, hidden text, scripts, IDs and original objects are
not copied. Generated creation metadata is removed too. Selectable text and
original PDF internals are lost; developer replays use the sanitized file.
PDFium operations are serialized because its API is not thread-safe.
Password-protected files are rejected.

Bounds are 20 MiB input, 32 MiB sanitized output, 12,000 pixels per side,
40 million decoded pixels total, and ten PDF pages. Very large files or
unsupported PDFs may be unreportable. Sanitizer failure stores nothing and
returns a safe error without logging source bytes or details.

## Retention and developer retrieval

Reports have **no automatic expiration**, as requested while there are no real
users. No lifecycle policy, cleanup job or expiry metadata exists. Reports
accumulate until a developer explicitly deletes them. Revisit this decision
before real-user collection. Railway itself records object upload timing;
that is not the original scan timestamp or an application account identifier.

The generated key is in `secrets/scan-report-encryption.key`, ignored by Git,
with permissions `0600`. Back it up securely outside the repository. Losing the
key makes reports unrecoverable. Replacing it requires retaining the historical
key for old reports or deliberately migrating them. The backend and authorized
developers can decrypt; the application is not prevented from reading reports.

Create an ignored `secrets/scan-reports.env` with actual values from the private
Railway Credentials page. Railway references are not expanded by the local CLI.
Do not paste secrets into chat or commit them.

```dotenv
SCAN_REPORT_S3_ENDPOINT=https://t3.storageapi.dev
SCAN_REPORT_S3_BUCKET=<actual S3 bucket name from BUCKET>
SCAN_REPORT_S3_REGION=auto
SCAN_REPORT_S3_ACCESS_KEY_ID=<private credential>
SCAN_REPORT_S3_SECRET_ACCESS_KEY=<private credential>
SCAN_REPORT_S3_ADDRESSING_STYLE=virtual
```

Use the endpoint/addressing style shown for this bucket; older Railway buckets
may require `path`. Supply the key via `SCAN_REPORT_ENCRYPTION_KEY` or a private
key file. Retrieval does not require collection to be enabled.

```bash
# Fresh installation only; refuses to overwrite an existing key.
.venv/bin/python scripts/scan_reports.py keygen

.venv/bin/python scripts/scan_reports.py --env-file secrets/scan-reports.env \
  --key-file secrets/scan-report-encryption.key list

.venv/bin/python scripts/scan_reports.py --env-file secrets/scan-reports.env \
  --key-file secrets/scan-report-encryption.key download <report-UUID> \
  --output secrets/retrieved-reports

.venv/bin/python scripts/scan_reports.py --env-file secrets/scan-reports.env \
  --key-file secrets/scan-report-encryption.key delete <report-UUID> --confirm

# Generated card only; always attempts to delete its synthetic report.
.venv/bin/python scripts/scan_reports.py --env-file secrets/scan-reports.env \
  --key-file secrets/scan-report-encryption.key smoke
```

Downloads authenticate/decrypt before creating a report directory. Files are
`scorecard.png` or `scorecard.pdf`, and `metadata.json`, inside a UUID directory.
Directories/files use `0700`/`0600`; existing output is never overwritten.
The CLI paginates, accepts only report UUID4s, and hides SDK exceptions,
credentials and contents on failure. There is no public retrieval endpoint or
presigned URL. Keep decrypted reports private. Use sanitized files with
`scripts/quick_scan_eval.py` when intentionally evaluating the scanner; reporting
never runs OCR or supplies verified expected scores automatically.

Provision the corresponding backend `SCAN_REPORT_S3_*` settings using Railway
bucket references `BUCKET`, `REGION`, `ENDPOINT`, `ACCESS_KEY_ID` and
`SECRET_ACCESS_KEY`. Set the encryption key securely and keep collection
disabled until code/storage verification is complete. Railway buckets are
private and encrypted at rest; explicit S3 server-side encryption options and
native lifecycle configuration are unsupported. This adapter adds application
encryption without requesting those APIs. See
[Railway storage buckets](https://docs.railway.com/storage-buckets).

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
.venv/bin/python -m pytest -q tests/test_scan_report_sanitizer.py tests/test_scan_report_crypto.py tests/test_scan_report_storage.py tests/test_scan_report_cli.py tests/test_scan_report_logging.py tests/test_scan_report_routes.py tests/test_scan_report_service.py tests/test_scan_router_helpers.py tests/test_api_main.py
cd frontend
npm test -- src/data/scanReportRepository.test.ts src/hooks/tests/useFailedScanReport.test.tsx src/hooks/tests/scanFailureLifecycle.test.tsx
npm run test:screenshots -- src/components/scan/tests/ScanReport.screenshot.spec.ts --workers=1
```

The browser tests use a named stateful fake backend and a screen robot. They
exercise both scan entrypoints, retry, pending/saved/unavailable states, and
credential omission at desktop/mobile sizes in light/dark modes. Screenshots
are attached for visual review, not compared to committed baselines. No live
OCR or database is contacted.

Storage tests use real decoders and AES-GCM with synthetic metadata-bearing files,
a stateful S3 fake for retry/failure behavior, and SDK request stubs for
conditional-write parameters. They cover hidden PDF content, orientation and
bounds, tampering/wrong keys, configuration, pagination, private output,
explicit deletion and access-log privacy. The separate `smoke` command verifies
real-provider private access, encryption, retries, retrieval and deletion;
record its result separately from local/fake tests.
