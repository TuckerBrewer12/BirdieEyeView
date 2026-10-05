import json
from dataclasses import asdict
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from api.dependencies import get_db, get_optional_current_user
from api.main import create_app
from api.routers import scan, scan_reports
from services.scan_report_service import AnonymousScanReport
from tests.test_scan_report_storage import configure_environment, make_store


class FakeReportStore:
    def __init__(self, *, fail=False):
        self.reports: dict = {}
        self.fail = fail

    async def save(self, report: AnonymousScanReport) -> bool:
        if self.fail:
            raise RuntimeError("private-user@example.com storage-key=secret")
        self.reports.setdefault(report.retry_key, report)
        return True


def image_bytes():
    output = BytesIO()
    Image.new("RGB", (20, 10), "white").save(output, format="PNG")
    return output.getvalue()


def metadata(**overrides):
    return {
        "schema_version": 1, "retry_key": str(uuid4()),
        "category": "unreadable_scores", "stage": "parse", "http_status": 422,
        **overrides,
    }


def client_for(store=None):
    app = create_app()
    if store is not None:
        app.dependency_overrides[scan_reports.get_scan_report_store] = lambda: store
    # No lifespan/database initialization or provider credentials needed.
    return TestClient(app, base_url="http://localhost", raise_server_exceptions=False)


def send_report(client, *, values=None, contents=None, extra=None, headers=None):
    return client.post(
        "/api/scan/reports",
        data={"metadata": json.dumps(metadata() if values is None else values), **(extra or {})},
        files={"file": ("private-user-scorecard.png", image_bytes() if contents is None else contents, "image/png")},
        headers=headers or {},
    )


def test_reporting_is_unavailable_without_storage_or_database():
    response = send_report(client_for())
    assert response.status_code == 503
    assert response.json()["code"] == "report_storage_unavailable"
    assert "not saved" in response.json()["detail"]
    assert response.headers["cache-control"] == "no-store"


def test_app_configuration_wires_real_encryption_and_sanitation_without_database(monkeypatch):
    import boto3
    store = make_store()
    configure_environment(monkeypatch)
    monkeypatch.setattr(boto3, "client", lambda *args, **kwargs: store.client)
    values = metadata()
    response = send_report(client_for(), values=values, headers={"authorization": "Bearer private-user", "cookie": "access_token=private-user"})
    assert response.json() == {"status": "saved"}
    from uuid import UUID
    restored = store.retrieve(UUID(values["retry_key"]))
    assert restored.metadata.category == values["category"]
    assert set(restored.metadata.model_dump()) == {"schema_version", "retry_key", "category", "stage", "http_status", "media_type"}
    assert len(store.client.objects) == 2  # One private reservation and one encrypted report.
    assert sum(key.endswith(".bev") for key in store.client.objects) == 1


def test_configured_storage_sanitation_failure_is_safe_and_never_stored(caplog):
    store = make_store()
    response = client_for(store).post(
        "/api/scan/reports", data={"metadata": json.dumps(metadata())},
        files={"file": ("card.pdf", b"%PDF-malformed-private-user", "application/pdf")},
    )
    assert response.status_code == 503 and response.json()["code"] == "report_not_saved"
    assert not store.client.objects
    assert "private-user" not in response.text + caplog.text


def test_anonymous_report_has_only_allowlisted_data_and_retries_are_idempotent():
    store = FakeReportStore()
    client = client_for(store)
    values = metadata()
    for headers in ({}, {"authorization": "Bearer secret-account", "cookie": "access_token=secret-account"}):
        response = send_report(client, values=values, headers=headers)
        assert response.status_code == 200
        assert response.json() == {"status": "saved"}
    assert len(store.reports) == 1
    report = next(iter(store.reports.values()))
    assert report.image == image_bytes()
    assert report.media_type == "image/png"
    assert (report.category, report.stage, report.http_status) == ("unreadable_scores", "parse", 422)
    assert set(asdict(report)) == {
        "image", "media_type", "retry_key", "category", "stage", "http_status", "schema_version",
    }
    assert "private-user" not in repr(report)


@pytest.mark.parametrize("extra", [
    {"user_id": "secret-account"}, {"filename": "private-user.png"},
    {"user_context": "private-user@example.com"}, {"scan_id": str(uuid4())},
    {"category": "private-user@example.com"}, {"http_status": "422"}, {"schema_version": 2},
    {"retry_key": "user123"}, {"stage": "internal traceback"},
])
def test_metadata_rejects_identity_fields_and_invalid_values_without_echoing_them(extra):
    store = FakeReportStore()
    response = send_report(client_for(store), values=metadata(**extra))
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid report metadata."}
    assert not store.reports


def test_extra_multipart_fields_are_rejected():
    store = FakeReportStore()
    response = send_report(client_for(store), extra={"user_id": "secret-account"})
    assert response.status_code == 422
    assert "secret-account" not in response.text
    assert not store.reports


def test_duplicate_multipart_fields_are_rejected():
    client = client_for(FakeReportStore())
    response = client.post("/api/scan/reports", files=[
        ("file", ("card.png", image_bytes(), "image/png")),
        ("metadata", (None, json.dumps(metadata()))),
        ("metadata", (None, json.dumps(metadata()))),
    ])
    assert response.status_code == 422


def test_malformed_image_never_reaches_store():
    store = FakeReportStore()
    response = send_report(client_for(store), contents=b"not an image")
    assert response.status_code == 400
    assert not store.reports


def test_upload_limit_applies_even_without_storage(monkeypatch):
    monkeypatch.setattr(scan_reports, "MAX_UPLOAD_BYTES", 5)
    assert send_report(client_for(), contents=b"123456").status_code == 413


def test_oversized_metadata_is_rejected_without_echo():
    response = send_report(client_for(), values=metadata(user_context="secret" * 400))
    assert response.status_code == 422
    assert "secret" not in response.text


def test_storage_failure_is_not_acknowledged_or_logged_with_identity(caplog):
    store = FakeReportStore(fail=True)
    response = send_report(client_for(store))
    assert response.status_code == 503
    assert response.json()["code"] == "report_not_saved"
    assert not store.reports
    assert "secret" not in response.text + caplog.text
    assert "private-user" not in response.text + caplog.text


def test_report_limit_is_independent_of_extraction_and_cannot_be_bypassed_with_auth(monkeypatch, caplog):
    monkeypatch.setenv("API_SCAN_REPORT_LIMIT_MAX_REQUESTS", "1")
    monkeypatch.setenv("API_SCAN_LIMIT_MAX_UNAUTH_REQUESTS", "1")
    client = client_for()
    # Even an invalid extraction consumes the scan budget, but not the report budget.
    client.post("/api/scan/extract")
    assert send_report(client).status_code == 503
    limited = send_report(client, headers={"authorization": "Bearer secret", "user-agent": "private-device"})
    assert limited.status_code == 429
    assert int(limited.headers["retry-after"]) > 0
    assert "private-device" not in caplog.text


def test_global_report_limit_does_not_log_request_identity(monkeypatch, caplog):
    monkeypatch.setenv("API_RATE_LIMIT_MAX_REQUESTS", "1")
    client = client_for()
    send_report(client)
    assert send_report(client, headers={"user-agent": "private-device"}).status_code == 429
    assert "ip=anonymous" in caplog.text
    assert "ip=testclient" not in caplog.text
    assert "private-device" not in caplog.text


def test_unhandled_report_errors_do_not_log_exception_or_traffic_identity(monkeypatch, caplog):
    monkeypatch.setenv("TRAFFIC_REQUEST_THRESHOLD", "1")
    client = client_for()

    def broken_store():
        raise RuntimeError("secret-account private-user@example.com")

    client.app.dependency_overrides[scan_reports.get_scan_report_store] = broken_store
    response = send_report(client, headers={"user-agent": "private-device"})
    assert response.status_code == 500
    assert "Anonymous scan report request failed" in caplog.text
    assert "secret-account" not in caplog.text + response.text
    assert "private-device" not in caplog.text
    assert "testclient" not in caplog.text


def test_extraction_returns_safe_failure_category_without_changing_public_detail(monkeypatch):
    client = client_for()
    client.app.dependency_overrides[get_db] = lambda: SimpleNamespace()
    client.app.dependency_overrides[get_optional_current_user] = lambda: None

    async def unavailable_provider(path):
        raise EnvironmentError("MISTRAL_API_KEY=secret")

    monkeypatch.setattr(scan, "_run_ocr_pipeline", unavailable_provider)
    response = client.post("/api/scan/extract", files={"file": ("card.png", image_bytes(), "image/png")})
    assert response.status_code == 500
    assert response.json() == {
        "detail": "We couldn't scan this scorecard. Please try again.",
        "failure": {"category": "service_unavailable", "stage": "ocr"},
    }


def test_unreadable_scan_and_invalid_upload_have_distinct_categories():
    client = client_for()
    client.app.dependency_overrides[get_db] = lambda: SimpleNamespace()
    client.app.dependency_overrides[get_optional_current_user] = lambda: None
    invalid = client.post("/api/scan/extract", files={"file": ("card.exe", b"bad", "application/octet-stream")})
    assert invalid.status_code == 400
    assert invalid.json()["failure"] == {"category": "invalid_upload", "stage": "upload"}
    unreadable = client.post(
        "/api/scan/extract", data={"ocr_text": "No legible score rows"},
        files={"file": ("card.png", image_bytes(), "image/png")},
    )
    assert unreadable.status_code == 422
    assert unreadable.json()["failure"] == {"category": "unreadable_scores", "stage": "parse"}
