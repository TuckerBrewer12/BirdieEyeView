"""Versioned AES-GCM envelope. File content and diagnostic fields are encrypted."""

import base64
import json
import os
import struct
from dataclasses import dataclass, field
from typing import Literal
from uuid import UUID

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from pydantic import BaseModel, ConfigDict, Field, UUID4

from services.scan_report_service import AnonymousScanReport, FailureCategory, FailureStage
from services.scan_report_sanitizer import MAX_SANITIZED_BYTES

MAGIC = b"BEV-SCAN-REPORT\x01"
NONCE_BYTES = 12
MAX_HEADER_BYTES = 2048
MAX_ENVELOPE_BYTES = MAX_SANITIZED_BYTES + MAX_HEADER_BYTES + 128


class InvalidReportEnvelope(ValueError):
    pass


class StoredMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)
    schema_version: Literal[1]
    retry_key: UUID4
    category: FailureCategory
    stage: FailureStage
    http_status: int | None = Field(ge=100, le=599)
    media_type: Literal["image/png", "application/pdf"]


@dataclass(frozen=True)
class StoredScanReport:
    metadata: StoredMetadata
    image: bytes = field(repr=False)


def decode_key(value: str) -> bytes:
    try:
        key = base64.b64decode(value.strip(), validate=True)
        if len(key) != 32:
            raise ValueError
        return key
    except Exception:
        raise ValueError("A base64-encoded 32-byte report key is required.") from None


class ReportCipher:
    def __init__(self, key: bytes):
        if len(key) != 32:
            raise ValueError("A 32-byte report key is required.")
        self._cipher = AESGCM(key)

    def encrypt(self, report: AnonymousScanReport, image: bytes, media_type: str) -> bytes:
        metadata = StoredMetadata.model_validate_json(json.dumps({
            "schema_version": report.schema_version, "retry_key": str(report.retry_key),
            "category": report.category, "stage": report.stage,
            "http_status": report.http_status, "media_type": media_type,
        }))
        header = metadata.model_dump_json().encode()
        if not image or len(image) > MAX_SANITIZED_BYTES or len(header) > MAX_HEADER_BYTES:
            raise InvalidReportEnvelope("Invalid report size.")
        nonce = os.urandom(NONCE_BYTES)
        payload = struct.pack(">I", len(header)) + header + image
        return MAGIC + nonce + self._cipher.encrypt(nonce, payload, MAGIC)

    def decrypt(self, envelope: bytes, expected_retry_key: UUID) -> StoredScanReport:
        try:
            if not envelope.startswith(MAGIC) or not len(MAGIC) + NONCE_BYTES + 20 < len(envelope) <= MAX_ENVELOPE_BYTES:
                raise ValueError
            start = len(MAGIC)
            payload = self._cipher.decrypt(envelope[start:start + NONCE_BYTES], envelope[start + NONCE_BYTES:], MAGIC)
            header_size = struct.unpack(">I", payload[:4])[0]
            if not 0 < header_size <= MAX_HEADER_BYTES or len(payload) <= 4 + header_size:
                raise ValueError
            metadata = StoredMetadata.model_validate_json(payload[4:4 + header_size])
            if metadata.retry_key != expected_retry_key:
                raise ValueError
            image = payload[4 + header_size:]
            if len(image) > MAX_SANITIZED_BYTES:
                raise ValueError
            return StoredScanReport(metadata, image)
        except Exception:
            raise InvalidReportEnvelope("Invalid encrypted report.") from None
