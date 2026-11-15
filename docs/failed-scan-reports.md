# Failed scan reporting

The scan page and the landing page's try-it share one control: "Report scan",
a small link in the failed scan's banner. It opens a dialog that says what is
sent (the photo and why it failed, nothing about the account), and nothing is
sent until the golfer taps Send report. A new photo or a new scan clears the old
report. A retry keeps the report's retry key.

## Durable storage and rollout

`services/scan_report_storage.py` implements `ScanReportStore` with private
S3-compatible storage and AES-256-GCM application encryption. Application setup
injects it only when `SCAN_REPORT_STORAGE_ENABLED=true` and all required settings
are valid. Missing/broken configuration leaves reporting unavailable without
preventing scanning, round saving, or API startup. No database is used.

Every upload is sanitized before encryption and persistence. One encrypted
object contains the cleaned file and allowlisted diagnostic JSON. New keys are
`reports/v1/YYYY-MM-DD_HH-MM-SSZ_<report-only-UUID4>.bev`. The visible filename
timestamp is UTC (`Z`), making report times distinguishable in Railway's file
list even when its date column only shows a day. Existing
`reports/v1/<report-only-UUID4>.bev` objects remain unchanged and supported.
Neither format includes an original filename, account, course, or original scan
timestamp. Objects have a generic binary content type and no custom
metadata or public ACL. Each envelope uses a fresh nonce and authenticated
version header. The encryption key is separate from S3/application credentials.

Create-only conditional PUT prevents concurrent retries from overwriting a
report. A successful PUT or duplicate response is followed by a bounded GET and
authenticated decryption. The saved file and diagnostics must match the retry
before the API returns `saved`. Conflicting retries, corruption, unsupported
conditional writes and provider failures produce safe 503 responses. A retry
can recover a durable report whose previous acknowledgement was lost.

For new reports, a create-only, empty private object at
`report-index/v1/<report-only-UUID4>` reserves the timestamp before the encrypted
upload. Its provider `LastModified` time fixes the filename across concurrent
workers and later retries; a retry never replaces the reservation. This is the
time storage was initialized, not necessarily the upload completion time after
a delayed retry. The index contains no image, diagnostics or account data and
is outside the report file-list prefix. An index alone is never acknowledged as
a saved report. Interrupted uploads can leave an empty index for a later retry
to complete. Explicit deletion removes the encrypted report before its index
so an interrupted deletion can be retried. Legacy reports need no index.

Collection is disabled by default. While disabled, `POST /api/scan/reports`
returns 503 with `code: report_storage_unavailable`; the UI says the report was
not saved. No memory queue or filesystem archive acknowledges discarded reports.

### Railway setup and rollout status — October 5, 2026 (UTC)

The connected Railway plugin configured eight dedicated backend variables with
deployments skipped: enabled state, bucket, endpoint, region, addressing style,
two S3 credentials and encryption key on October 2. The five bucket values use
`${{failed-scan-reports.<VARIABLE>}}` references; credentials were not exported.
Collection was initially disabled until the feature was merged and verified.

Bucket activation was verified through the connected Railway plugin on
October 2, 2026. `failed-scan-reports`, bucket ID
`685b6426-744d-42eb-b682-6acd8cb34b3a`, is active in region `sjc`. There are no
remaining staged/applying environment changes. The backend, frontend and
Postgres retain their previous successful deployments; activating the bucket
did not deploy the feature code.

The real-provider `smoke` check passed on October 2, 2026 using a generated
scorecard and private local credentials. It verified encrypted persistence,
embedded metadata removal, authenticated developer retrieval, concurrent
create-only retries without overwriting, blocked unsigned public access, and
deletion of the synthetic report. No real scorecard was uploaded for this check.
Local S3 settings are in ignored `secrets/scan-reports.env`; the unchanged
encryption key remains separately in `secrets/scan-report-encryption.key`.
Both files have `0600` permissions. Do not paste credentials into chat.

The initial reporting feature was merged into `main` in PR #339. Collection was
enabled on the production backend on October 5 (UTC), and deployment succeeded.
A synthetic report submitted through the production endpoint returned `saved`,
authenticated retrieval verified encryption and metadata removal, and only
that synthetic report was deleted. Existing reports were left untouched.
Timestamped filenames require merging and deploying the follow-up change;
existing reports are not backfilled. Connected
OAuth tools expose variable names rather than credential values; the live check
ran through the developer CLI using the ignored local credentials file.

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
applies EXIF orientation, and writes fresh JPEG pixels at the scanner's size: at
most 2,000 px on the long edge, quality 80, the same as the frontend upload and the
OCR input. Transparent areas become white. EXIF/GPS, XMP, comments, ICC payloads
and trailing bytes are not copied; a stored JPEG carries only its standard JFIF
header. Visible names are retained. The stored image is nearly pixel-identical to
what the scanner read, not byte-identical. Storing lossless full-size PNG made
each report 4–6× larger than the upload (about 2.5–5 MB); a report is now about
the upload's size (roughly 300–500 KB).
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
`scorecard.jpg` (`scorecard.png` for reports saved before November 2026) or
`scorecard.pdf`, and `metadata.json`, inside a UUID directory.
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

- `ScanReport` (`brand/components`) is the banner's link and its
  `ConfirmDialog`. A failed send shows in the dialog; once sent, the link reads
  "Report sent" with a check and keeps focus.
- `useFailedScanReport` is a `useMutation` keyed by the report's retry key
  (`queryKeys.scanReport`) and read back with `useMutationState`, so a sent
  report still shows as sent after the golfer leaves the scan page and returns.
- `scanReportRepository` calls `api.reportFailedScan`, which sends the multipart
  form without credentials or a referrer. The endpoint's responses are typed
  (`ScanReportResponse`, and `ScanReportErrorResponse` for a 503).
- `useScanPageViewModel` and `useTryItYourselfViewModel` keep the failed attempt
  and pass `report` to the banner.

## Focused verification

```bash
.venv/bin/python -m pytest -q tests/test_scan_report_sanitizer.py tests/test_scan_report_crypto.py tests/test_scan_report_storage.py tests/test_scan_report_cli.py tests/test_scan_report_logging.py tests/test_scan_report_routes.py tests/test_scan_report_service.py tests/test_scan_router_helpers.py tests/test_api_main.py
cd frontend
npx vitest run src/data/tests/scanReportRepository.test.ts src/data/tests/useFailedScanReportTest.tsx
npm run test:espresso -- src/pages/scan/tests/ScanPage.espresso.spec.ts src/pages/landing-page/tests/LandingPage.espresso.spec.ts
npm run test:screenshots -- src/brand/tests/screenshots/components/ScanReport.screenshot.spec.ts src/pages/scan/tests/ScanPage.screenshot.spec.ts
```

The espresso flows run on `FakeBackend` through each page's robot: a sent
report, one that can't be stored, a sent report after leaving the page, a new
photo clearing it, and a report from the landing page without an account. The
screenshots cover the banner, sent and not, and the dialog. No live OCR or
database is contacted.

Storage tests use real decoders and AES-GCM with synthetic metadata-bearing files,
a stateful S3 fake for retry/failure behavior, and SDK request stubs for
conditional-write parameters. They cover hidden PDF content, orientation and
bounds, tampering/wrong keys, configuration, pagination, private output,
explicit deletion and access-log privacy. The separate `smoke` command verifies
real-provider private access, encryption, retries, retrieval and deletion;
record its result separately from local/fake tests.
