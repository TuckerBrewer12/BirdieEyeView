import asyncio
import base64
from dataclasses import replace
from io import BytesIO
from threading import Lock
from unittest.mock import Mock

import boto3
from botocore.exceptions import ClientError
from botocore.stub import Stubber, ANY
import pytest

from services.scan_report_crypto import ReportCipher
from services.scan_report_storage import (
    PREFIX, EncryptedScanReportStore, ScanReportStorageConfig, configured_scan_report_store, report_object_key,
)
from tests.scan_report_fixtures import IDENTIFIER, pdf_card, png_card, report


class StatefulPrivateS3:
    def __init__(self):
        self.objects = {}
        self.writes = []
        self.deleted = []
        self.lock = Lock()
        self.fail_put = None
        self.corrupt_write = False
        self.drop_write = False
        self.last_body = None

    def put_object(self, **params):
        with self.lock:
            self.writes.append(params)
            if self.fail_put is not None:
                raise self.fail_put
            if params["Key"] in self.objects:
                raise ClientError({"Error": {"Code": "PreconditionFailed"}, "ResponseMetadata": {"HTTPStatusCode": 412}}, "PutObject")
            assert params["IfNoneMatch"] == "*"
            if not self.drop_write:
                self.objects[params["Key"]] = b"corrupt" if self.corrupt_write else params["Body"]
            return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    def get_object(self, **params):
        data = self.objects[params["Key"]]
        self.last_body = BytesIO(data)
        return {"Body": self.last_body, "ContentLength": len(data)}

    def get_paginator(self, name):
        assert name == "list_objects_v2"
        owner = self

        class Paginator:
            def paginate(self, **params):
                assert params == {"Bucket": "private-test", "Prefix": PREFIX}
                # One item per page exercises real iteration across page boundaries.
                yield {}
                for key in owner.objects:
                    yield {"Contents": [{"Key": key}]}
        return Paginator()

    def delete_object(self, **params):
        self.deleted.append(params)
        self.objects.pop(params["Key"], None)


def make_store(client=None):
    return EncryptedScanReportStore(client or StatefulPrivateS3(), "private-test", ReportCipher(bytes(range(32))))


@pytest.mark.asyncio
async def test_durable_retry_and_concurrent_retry_preserve_one_encrypted_object():
    store = make_store()
    item = report()
    assert await store.save(item) is True
    initial = next(iter(store.client.objects.values()))
    assert await asyncio.gather(store.save(item), store.save(item)) == [True, True]
    assert len(store.client.objects) == 1
    assert next(iter(store.client.objects.values())) == initial
    assert IDENTIFIER.encode() not in initial and png_card() not in initial
    restored = store.retrieve(item.retry_key)
    assert IDENTIFIER.encode() not in restored.image
    assert restored.metadata.retry_key == item.retry_key
    assert store.client.last_body.closed
    assert set(store.client.writes[0]) == {"Bucket", "Key", "Body", "ContentType", "IfNoneMatch"}


def test_pdf_retry_is_deterministic_after_identifier_and_date_removal():
    store = make_store()
    item = report(image=pdf_card(), media_type="application/pdf")
    assert store.save_sync(item) is True
    assert store.save_sync(item) is True
    restored = store.retrieve(item.retry_key)
    assert restored.metadata.media_type == "application/pdf"
    assert IDENTIFIER.encode() not in restored.image and b"/CreationDate" not in restored.image


@pytest.mark.parametrize("changes", [{"stage": "unknown"}, {"image": b"bad"}, {"category": "network_error"}])
def test_changed_retry_never_overwrites_or_acknowledges_existing_report(changes):
    store = make_store()
    item = report()
    store.save_sync(item)
    initial = dict(store.client.objects)
    with pytest.raises(ValueError):
        store.save_sync(replace(item, **changes))
    assert store.client.objects == initial


@pytest.mark.parametrize("failure", ["corrupt", "drop", "permission", "timeout", "unsupported-conditional"])
def test_failed_or_unverified_writes_never_return_saved(failure):
    store = make_store()
    if failure == "corrupt":
        store.client.corrupt_write = True
    elif failure == "drop":
        store.client.drop_write = True
    elif failure == "permission":
        store.client.fail_put = ClientError({"Error": {"Code": "AccessDenied"}, "ResponseMetadata": {"HTTPStatusCode": 403}}, "PutObject")
    elif failure == "unsupported-conditional":
        store.client.fail_put = ClientError({"Error": {"Code": "NotImplemented"}, "ResponseMetadata": {"HTTPStatusCode": 501}}, "PutObject")
    else:
        store.client.fail_put = TimeoutError("private-user@example.com secret-storage-key")
    with pytest.raises((ValueError, KeyError, ClientError, TimeoutError)):
        store.save_sync(report())


def test_corrupted_existing_report_cannot_be_acknowledged_by_a_retry():
    store = make_store()
    item = report()
    store.client.objects[report_object_key(item.retry_key)] = b"bad"
    with pytest.raises(ValueError):
        store.save_sync(item)


def test_sanitization_error_makes_no_storage_calls():
    client = Mock()
    with pytest.raises(ValueError):
        make_store(client).save_sync(report(image=b"malformed"))
    assert not client.mock_calls


def test_real_sdk_parameters_use_create_only_private_binary_write():
    item = report()
    client = boto3.client("s3", region_name="auto", endpoint_url="https://storage.invalid",
                          aws_access_key_id="synthetic-test", aws_secret_access_key="synthetic-test")
    store = make_store(client)
    from services.scan_report_sanitizer import sanitize_scorecard
    image, media = sanitize_scorecard(item.image, item.media_type)
    persisted = store.cipher.encrypt(item, image, media)
    with Stubber(client) as stub:
        stub.add_response("put_object", {}, {"Bucket": "private-test", "Key": report_object_key(item.retry_key),
                          "Body": ANY, "ContentType": "application/octet-stream", "IfNoneMatch": "*"})
        stub.add_response("get_object", {"Body": BytesIO(persisted), "ContentLength": len(persisted)},
                          {"Bucket": "private-test", "Key": report_object_key(item.retry_key)})
        assert store.save_sync(item) is True
        stub.assert_no_pending_responses()


def test_listing_is_paginated_and_deletion_only_targets_the_selected_report():
    store = make_store()
    first, second = report(), report()
    store.save_sync(first)
    store.save_sync(second)
    store.client.objects[f"{PREFIX}private-name.txt"] = b"unrelated"
    assert list(store.list_report_ids()) == [first.retry_key, second.retry_key]
    store.delete(first.retry_key)
    assert report_object_key(second.retry_key) in store.client.objects
    assert store.client.deleted == [{"Bucket": "private-test", "Key": report_object_key(first.retry_key)}]


def configure_environment(monkeypatch):
    settings = {
        "SCAN_REPORT_STORAGE_ENABLED": "true", "SCAN_REPORT_S3_ENDPOINT": "https://storage.invalid",
        "SCAN_REPORT_S3_BUCKET": "private-test", "SCAN_REPORT_S3_REGION": "auto",
        "SCAN_REPORT_S3_ACCESS_KEY_ID": "synthetic-test", "SCAN_REPORT_S3_SECRET_ACCESS_KEY": "synthetic-test",
        "SCAN_REPORT_ENCRYPTION_KEY": base64.b64encode(bytes(range(32))).decode(),
        "SCAN_REPORT_S3_ADDRESSING_STYLE": "virtual",
    }
    for name, value in settings.items():
        monkeypatch.setenv(name, value)


def test_configuration_never_connects_to_storage_and_explicitly_configures_sdk(monkeypatch):
    configure_environment(monkeypatch)
    config = ScanReportStorageConfig.from_environment()
    assert "synthetic-test" not in repr(config)
    create_client = Mock(return_value=StatefulPrivateS3())
    monkeypatch.setattr(boto3, "client", create_client)
    assert configured_scan_report_store() is not None
    options = create_client.call_args.kwargs
    assert options["endpoint_url"] == "https://storage.invalid"
    assert options["aws_secret_access_key"] == "synthetic-test"
    assert options["config"].s3 == {"addressing_style": "virtual"}
    assert options["config"].connect_timeout == 5 and options["config"].read_timeout == 15


@pytest.mark.parametrize("name,value", [
    ("SCAN_REPORT_S3_ENDPOINT", "http://storage.invalid"), ("SCAN_REPORT_S3_ENDPOINT", "https://private-user:secret@storage.invalid"),
    ("SCAN_REPORT_S3_ENDPOINT", "https://storage.invalid/?secret=private-user"),
    ("SCAN_REPORT_S3_SECRET_ACCESS_KEY", ""), ("SCAN_REPORT_S3_REGION", ""),
    ("SCAN_REPORT_ENCRYPTION_KEY", "private-key"), ("SCAN_REPORT_S3_ADDRESSING_STYLE", "invalid"),
])
def test_invalid_configuration_disables_reports_without_secret_logging(monkeypatch, caplog, name, value):
    configure_environment(monkeypatch)
    monkeypatch.setenv(name, value)
    assert configured_scan_report_store() is None
    assert "private-user" not in caplog.text and "private-key" not in caplog.text


def test_disabled_store_does_not_construct_an_sdk_client(monkeypatch):
    configure_environment(monkeypatch)
    monkeypatch.setenv("SCAN_REPORT_STORAGE_ENABLED", "false")
    client = Mock()
    monkeypatch.setattr(boto3, "client", client)
    assert configured_scan_report_store() is None
    client.assert_not_called()
