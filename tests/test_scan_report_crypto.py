import base64
import json
import struct

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from services.scan_report_crypto import MAGIC, InvalidReportEnvelope, ReportCipher, decode_key
from services.scan_report_sanitizer import sanitize_scorecard
from tests.scan_report_fixtures import report


def test_encrypts_entire_report_with_fresh_nonce_and_authenticates_retry_key():
    item = report()
    image, media_type = sanitize_scorecard(item.image, item.media_type)
    cipher = ReportCipher(bytes(range(32)))
    first = cipher.encrypt(item, image, media_type)
    second = cipher.encrypt(item, image, media_type)
    assert first != second
    assert image not in first and b"unreadable_scores" not in first and str(item.retry_key).encode() not in first
    restored = cipher.decrypt(first, item.retry_key)
    assert restored.image == image
    assert restored.metadata.model_dump(mode="json") == {
        "schema_version": 1, "retry_key": str(item.retry_key), "category": "unreadable_scores",
        "stage": "parse", "http_status": 422, "media_type": "image/png",
    }


def test_tampered_wrong_key_and_wrong_report_envelopes_are_rejected():
    item = report()
    cipher = ReportCipher(bytes(range(32)))
    image, media = sanitize_scorecard(item.image, item.media_type)
    encrypted = cipher.encrypt(item, image, media)
    for value, key, retry in [
        (b"bad", bytes(range(32)), item.retry_key),
        (encrypted[:-1] + bytes([encrypted[-1] ^ 1]), bytes(range(32)), item.retry_key),
        (encrypted, b"x" * 32, item.retry_key),
        (encrypted, bytes(range(32)), report().retry_key),
    ]:
        with pytest.raises(InvalidReportEnvelope, match="Invalid encrypted report"):
            ReportCipher(key).decrypt(value, retry)


def test_authenticated_payload_still_rejects_unexpected_identity_fields():
    item = report()
    key = bytes(range(32))
    nonce = bytes(range(12))
    header = json.dumps({"schema_version": 1, "retry_key": str(item.retry_key), "user_id": "private-user"}).encode()
    payload = struct.pack(">I", len(header)) + header + b"image"
    encrypted = MAGIC + nonce + AESGCM(key).encrypt(nonce, payload, MAGIC)
    with pytest.raises(InvalidReportEnvelope):
        ReportCipher(key).decrypt(encrypted, item.retry_key)


def test_key_decoder_requires_exactly_256_bits():
    assert decode_key(base64.b64encode(bytes(range(32))).decode()) == bytes(range(32))
    for value in ("private-key", "", base64.b64encode(b"short").decode()):
        with pytest.raises(ValueError, match="32-byte"):
            decode_key(value)
