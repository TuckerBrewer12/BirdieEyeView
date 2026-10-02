"""Private S3 storage. A report is acknowledged only after authenticated durability."""

import logging
import os
from dataclasses import dataclass, field
from urllib.parse import urlsplit
from uuid import UUID

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from starlette.concurrency import run_in_threadpool

from services.scan_report_crypto import MAX_ENVELOPE_BYTES, ReportCipher, StoredScanReport, decode_key
from services.scan_report_sanitizer import sanitize_scorecard
from services.scan_report_service import AnonymousScanReport

PREFIX = "reports/v1/"


def report_object_key(report_id: UUID) -> str:
    value = UUID(str(report_id))
    if value.version != 4:
        raise ValueError("A report UUID4 is required.")
    return f"{PREFIX}{value}.bev"


@dataclass(frozen=True)
class ScanReportStorageConfig:
    endpoint: str
    bucket: str
    region: str
    access_key_id: str = field(repr=False)
    secret_access_key: str = field(repr=False)
    encryption_key: bytes = field(repr=False)
    addressing_style: str = "virtual"

    @classmethod
    def from_environment(cls, *, encryption_key: bytes | None = None):
        config = cls(
            endpoint=os.environ.get("SCAN_REPORT_S3_ENDPOINT", "").strip(),
            bucket=os.environ.get("SCAN_REPORT_S3_BUCKET", "").strip(),
            region=os.environ.get("SCAN_REPORT_S3_REGION", "").strip(),
            access_key_id=os.environ.get("SCAN_REPORT_S3_ACCESS_KEY_ID", "").strip(),
            secret_access_key=os.environ.get("SCAN_REPORT_S3_SECRET_ACCESS_KEY", "").strip(),
            encryption_key=encryption_key if encryption_key is not None else decode_key(os.environ.get("SCAN_REPORT_ENCRYPTION_KEY", "")),
            addressing_style=os.environ.get("SCAN_REPORT_S3_ADDRESSING_STYLE", "virtual").strip(),
        )
        endpoint = urlsplit(config.endpoint)
        if (endpoint.scheme != "https" or not endpoint.hostname or endpoint.username or endpoint.password
                or endpoint.query or endpoint.fragment or endpoint.path not in {"", "/"}
                or not config.bucket or "/" in config.bucket or not config.region
                or not config.access_key_id or not config.secret_access_key
                or config.addressing_style not in {"virtual", "path"}):
            raise ValueError("Incomplete or invalid report storage configuration.")
        return config

    def create_store(self):
        client = boto3.client(
            "s3", endpoint_url=self.endpoint, region_name=self.region,
            aws_access_key_id=self.access_key_id, aws_secret_access_key=self.secret_access_key,
            config=Config(connect_timeout=5, read_timeout=15, retries={"mode": "standard", "total_max_attempts": 2},
                          s3={"addressing_style": self.addressing_style}),
        )
        return EncryptedScanReportStore(client, self.bucket, ReportCipher(self.encryption_key))


def configured_scan_report_store():
    if os.environ.get("SCAN_REPORT_STORAGE_ENABLED", "false").strip().lower() != "true":
        return None
    try:
        return ScanReportStorageConfig.from_environment().create_store()
    except Exception:
        logging.getLogger(__name__).warning("Anonymous report storage is unavailable; check configuration.")
        return None


class EncryptedScanReportStore:
    def __init__(self, client, bucket: str, cipher: ReportCipher):
        self.client = client
        self.bucket = bucket
        self.cipher = cipher

    async def save(self, report: AnonymousScanReport) -> bool:
        return await run_in_threadpool(self.save_sync, report)

    def _get_envelope(self, report_id: UUID) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=report_object_key(report_id))
        body = response["Body"]
        try:
            if response.get("ContentLength", 0) > MAX_ENVELOPE_BYTES:
                raise ValueError("Invalid encrypted report size.")
            envelope = body.read(MAX_ENVELOPE_BYTES + 1)
            if len(envelope) > MAX_ENVELOPE_BYTES:
                raise ValueError("Invalid encrypted report size.")
            return envelope
        finally:
            body.close()

    def retrieve(self, report_id: UUID) -> StoredScanReport:
        return self.cipher.decrypt(self._get_envelope(report_id), report_id)

    def save_sync(self, report: AnonymousScanReport) -> bool:
        image, media_type = sanitize_scorecard(report.image, report.media_type)
        envelope = self.cipher.encrypt(report, image, media_type)
        candidate = self.cipher.decrypt(envelope, report.retry_key)
        key = report_object_key(report.retry_key)
        try:
            self.client.put_object(Bucket=self.bucket, Key=key, Body=envelope,
                                   ContentType="application/octet-stream", IfNoneMatch="*")
        except ClientError as exc:
            # A 412 alone isn't proof this retry was saved; authenticate the object.
            if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 412:
                raise
        # Also verify a successful PUT, protecting against corrupted writes and
        # confirming an acknowledgement lost by the client's previous attempt.
        stored = self.retrieve(report.retry_key)
        if stored.metadata != candidate.metadata or stored.image != candidate.image:
            raise ValueError("Conflicting report retry.")
        return True

    def list_report_ids(self):
        for page in self.client.get_paginator("list_objects_v2").paginate(Bucket=self.bucket, Prefix=PREFIX):
            for item in page.get("Contents", []):
                key = item["Key"]
                try:
                    report_id = UUID(key.removeprefix(PREFIX).removesuffix(".bev"))
                    if report_object_key(report_id) == key:
                        yield report_id
                except ValueError:
                    continue

    def delete(self, report_id: UUID):
        self.client.delete_object(Bucket=self.bucket, Key=report_object_key(report_id))
