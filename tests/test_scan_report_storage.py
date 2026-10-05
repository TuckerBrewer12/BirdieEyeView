import asyncio
import base64
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from io import BytesIO
from threading import Lock
from unittest.mock import Mock
from uuid import uuid1

import boto3
from botocore.exceptions import ClientError
from botocore.stub import Stubber, ANY
import pytest

from services.scan_report_crypto import ReportCipher
from services.scan_report_storage import (
    PREFIX, EncryptedScanReportStore, ScanReportStorageConfig, configured_scan_report_store,
    report_id_from_object_key, report_index_key, report_object_key,
)
from tests.scan_report_fixtures import IDENTIFIER, pdf_card, png_card, report


class StatefulPrivateS3:
    def __init__(self):
        self.objects = {}
        self.last_modified = {}
        self.now = datetime(2026, 10, 5, 6, 7, 52, tzinfo=timezone.utc)
        self.writes = []
        self.deleted = []
        self.lock = Lock()
        self.fail_put = None
        self.corrupt_write = False
        self.drop_write = False
        self.drop_report_write = False
        self.fail_report_put = None
        self.last_body = None

    def put_object(self, **params):
        with self.lock:
            self.writes.append(params)
            if self.fail_put is not None:
                raise self.fail_put
            if params["Key"].startswith(PREFIX) and self.fail_report_put is not None:
                raise self.fail_report_put
            if params["Key"] in self.objects:
                raise ClientError({"Error": {"Code": "PreconditionFailed"}, "ResponseMetadata": {"HTTPStatusCode": 412}}, "PutObject")
            assert params["IfNoneMatch"] == "*"
            is_report = params["Key"].startswith(PREFIX)
            if not self.drop_write and not (is_report and self.drop_report_write):
                self.objects[params["Key"]] = b"corrupt" if is_report and self.corrupt_write else params["Body"]
                self.last_modified[params["Key"]] = self.now
            return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    def head_object(self, **params):
        with self.lock:
            if params["Key"] not in self.objects:
                raise ClientError({"Error": {"Code": "404"}, "ResponseMetadata": {"HTTPStatusCode": 404}}, "HeadObject")
            return {"ContentLength": len(self.objects[params["Key"]]),
                    "LastModified": self.last_modified.get(params["Key"], self.now)}

    def get_object(self, **params):
        if params["Key"] not in self.objects:
            raise ClientError({"Error": {"Code": "NoSuchKey"}, "ResponseMetadata": {"HTTPStatusCode": 404}}, "GetObject")
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
                    if key.startswith(params["Prefix"]):
                        yield {"Contents": [{"Key": key}]}
        return Paginator()

    def delete_object(self, **params):
        self.deleted.append(params)
        self.objects.pop(params["Key"], None)
        self.last_modified.pop(params["Key"], None)


def make_store(client=None):
    return EncryptedScanReportStore(client or StatefulPrivateS3(), "private-test", ReportCipher(bytes(range(32))))


@pytest.mark.asyncio
async def test_durable_retry_and_concurrent_retry_preserve_one_encrypted_object():
    store = make_store()
    item = report()
    assert await store.save(item) is True
    key = store.object_key(item.retry_key)
    assert key == f"{PREFIX}2026-10-05_06-07-52Z_{item.retry_key}.bev"
    initial = store.client.objects[key]
    store.client.now += timedelta(days=1)
    other_worker = make_store(store.client)
    assert await asyncio.gather(store.save(item), other_worker.save(item)) == [True, True]
    assert set(store.client.objects) == {key, report_index_key(item.retry_key)}
    assert store.client.objects[key] == initial
    assert other_worker.object_key(item.retry_key) == key
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
    timestamp = datetime(2026, 10, 5, 6, 7, 52, tzinfo=timezone.utc)
    key = report_object_key(item.retry_key, timestamp)
    with Stubber(client) as stub:
        stub.add_client_error("head_object", service_error_code="404", http_status_code=404,
                              expected_params={"Bucket": "private-test", "Key": report_object_key(item.retry_key)})
        stub.add_response("put_object", {}, {"Bucket": "private-test", "Key": report_index_key(item.retry_key),
                          "Body": b"", "ContentType": "application/octet-stream", "IfNoneMatch": "*"})
        stub.add_response("head_object", {"ContentLength": 0, "LastModified": timestamp},
                          {"Bucket": "private-test", "Key": report_index_key(item.retry_key)})
        stub.add_response("put_object", {}, {"Bucket": "private-test", "Key": key,
                          "Body": ANY, "ContentType": "application/octet-stream", "IfNoneMatch": "*"})
        stub.add_response("get_object", {"Body": BytesIO(persisted), "ContentLength": len(persisted)},
                          {"Bucket": "private-test", "Key": key})
        assert store.save_sync(item) is True
        stub.assert_no_pending_responses()


def test_listing_is_paginated_and_deletion_only_targets_the_selected_report():
    store = make_store()
    first, second = report(), report()
    store.save_sync(first)
    # An existing report written before timestamp naming remains unchanged.
    from services.scan_report_sanitizer import sanitize_scorecard
    image, media = sanitize_scorecard(second.image, second.media_type)
    legacy = report_object_key(second.retry_key)
    store.client.objects[legacy] = store.cipher.encrypt(second, image, media)
    first_key = store.object_key(first.retry_key)
    store.client.objects[f"{PREFIX}private-name.txt"] = b"unrelated"
    assert list(store.list_report_ids()) == [first.retry_key, second.retry_key]
    store.delete(first.retry_key)
    assert legacy in store.client.objects
    assert store.client.deleted == [{"Bucket": "private-test", "Key": first_key},
                                    {"Bucket": "private-test", "Key": report_index_key(first.retry_key)}]
    store.delete(second.retry_key)
    assert store.client.deleted[-1] == {"Bucket": "private-test", "Key": legacy}
    assert store.client.objects == {f"{PREFIX}private-name.txt": b"unrelated"}


def test_timestamp_keys_normalize_to_utc_and_round_trip_legacy_and_new_names():
    item = report()
    local_time = datetime(2026, 10, 4, 23, 7, 52, 123456, tzinfo=timezone(timedelta(hours=-7)))
    key = report_object_key(item.retry_key, local_time)
    assert key == f"{PREFIX}2026-10-05_06-07-52Z_{item.retry_key}.bev"
    assert report_id_from_object_key(key) == item.retry_key
    assert report_id_from_object_key(report_object_key(item.retry_key)) == item.retry_key
    with pytest.raises(ValueError):
        report_object_key(item.retry_key, local_time.replace(tzinfo=None))
    with pytest.raises(ValueError):
        report_object_key(uuid1(), local_time)


@pytest.mark.parametrize("name", [
    "2026-02-30_06-07-52Z", "2026-10-05_24-07-52Z", "2026-10-05_06-07-52",
    "2026-1-5_6-7-52Z", "2026-10-05_06-07-52.123Z", "../2026-10-05_06-07-52Z",
])
def test_listing_skips_malformed_timestamp_names(name):
    store = make_store()
    item = report()
    store.client.objects[f"{PREFIX}{name}_{item.retry_key}.bev"] = b"unrelated"
    assert list(store.list_report_ids()) == []


@pytest.mark.parametrize("key", [
    "other/v1/2026-10-05_06-07-52Z_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.bev",
    f"{PREFIX}2026-10-05_06-07-52Z_AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA.bev",
    f"{PREFIX}2026-10-05_06-07-52Z_aaaaaaaa-aaaa-1aaa-8aaa-aaaaaaaaaaaa.bev",
    f"{PREFIX}aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png",
])
def test_key_parser_rejects_noncanonical_or_unrelated_keys(key):
    with pytest.raises(ValueError):
        report_id_from_object_key(key)


@pytest.mark.asyncio
async def test_first_concurrent_submissions_across_workers_share_one_reservation():
    store = make_store()
    item = report()
    workers = [store, make_store(store.client), make_store(store.client)]
    assert await asyncio.gather(*(worker.save(item) for worker in workers)) == [True] * 3
    keys = {worker.object_key(item.retry_key) for worker in workers}
    assert len(keys) == 1
    assert set(store.client.objects) == keys | {report_index_key(item.retry_key)}


def test_reservation_alone_is_not_a_saved_report_and_retry_finishes_same_key():
    store = make_store()
    item = report()
    store.client.fail_report_put = TimeoutError("interrupted upload")
    with pytest.raises(TimeoutError):
        store.save_sync(item)
    key = store.object_key(item.retry_key)
    assert store.client.objects == {report_index_key(item.retry_key): b""}
    assert list(store.list_report_ids()) == []
    with pytest.raises(ClientError):
        store.retrieve(item.retry_key)
    store.client.fail_report_put = None
    store.client.now += timedelta(days=2)
    assert make_store(store.client).save_sync(item) is True
    assert store.object_key(item.retry_key) == key
    assert set(store.client.objects) == {key, report_index_key(item.retry_key)}


def test_dropped_encrypted_write_does_not_acknowledge_an_existing_reservation():
    store = make_store()
    item = report()
    store.client.drop_report_write = True
    with pytest.raises(ClientError):
        store.save_sync(item)
    assert store.client.objects == {report_index_key(item.retry_key): b""}
    assert list(store.list_report_ids()) == []


def test_retry_recovers_lost_acknowledgement_without_rewriting_timestamp_or_ciphertext(monkeypatch):
    store = make_store()
    item = report()
    original_put = store.client.put_object
    def lose_acknowledgement(**params):
        result = original_put(**params)
        if params["Key"].startswith(PREFIX):
            raise TimeoutError("acknowledgement lost after durable write")
        return result
    monkeypatch.setattr(store.client, "put_object", lose_acknowledgement)
    with pytest.raises(TimeoutError):
        store.save_sync(item)
    initial = dict(store.client.objects)
    monkeypatch.setattr(store.client, "put_object", original_put)
    store.client.now += timedelta(hours=5)
    assert make_store(store.client).save_sync(item) is True
    assert store.client.objects == initial


@pytest.mark.parametrize("timestamp,content", [
    (None, b""), ("2026-10-05T06:07:52Z", b""), (datetime(2026, 10, 5), b""),
    (datetime(2026, 10, 5, tzinfo=timezone.utc), b"nonempty"),
])
def test_invalid_reservation_fails_closed_without_writing_an_encrypted_report(timestamp, content):
    store = make_store()
    item = report()
    index = report_index_key(item.retry_key)
    store.client.objects[index] = content
    store.client.last_modified[index] = timestamp
    with pytest.raises(ValueError):
        store.save_sync(item)
    with pytest.raises(ValueError):
        store.retrieve(item.retry_key)
    with pytest.raises(ValueError):
        store.delete(item.retry_key)
    assert store.client.objects == {index: content}
    assert not store.client.deleted


@pytest.mark.parametrize("status", [403, 500])
def test_head_errors_do_not_get_treated_as_missing_reports(monkeypatch, status):
    store = make_store()
    failure = ClientError({"Error": {"Code": "Denied"}, "ResponseMetadata": {"HTTPStatusCode": status}}, "HeadObject")
    monkeypatch.setattr(store.client, "head_object", Mock(side_effect=failure))
    with pytest.raises(ClientError):
        store.save_sync(report())
    assert not store.client.writes


def test_existing_legacy_report_retry_does_not_create_index_or_timestamped_copy():
    store = make_store()
    item = report()
    from services.scan_report_sanitizer import sanitize_scorecard
    image, media = sanitize_scorecard(item.image, item.media_type)
    key = report_object_key(item.retry_key)
    initial = store.cipher.encrypt(item, image, media)
    store.client.objects[key] = initial
    assert store.save_sync(item) is True
    assert store.object_key(item.retry_key) == key
    assert store.client.objects == {key: initial}
    assert store.retrieve(item.retry_key).metadata.retry_key == item.retry_key


def test_deletion_cleans_an_interrupted_reservation_and_is_repeatable():
    store = make_store()
    item = report()
    index = report_index_key(item.retry_key)
    store.client.objects[index] = b""
    store.delete(item.retry_key)
    assert store.client.deleted == [{"Bucket": "private-test", "Key": report_object_key(item.retry_key, store.client.now)},
                                    {"Bucket": "private-test", "Key": index}]
    store.delete(item.retry_key)
    assert not store.client.objects and len(store.client.deleted) == 2


def test_failed_deletion_keeps_reservation_so_selected_report_can_be_retried(monkeypatch):
    store = make_store()
    first, second = report(), report()
    store.save_sync(first)
    store.save_sync(second)
    first_key = store.object_key(first.retry_key)
    second_key = store.object_key(second.retry_key)
    original_delete = store.client.delete_object
    def fail_index_delete(**params):
        if params["Key"] == report_index_key(first.retry_key):
            raise TimeoutError("index deletion interrupted")
        original_delete(**params)
    monkeypatch.setattr(store.client, "delete_object", fail_index_delete)
    with pytest.raises(TimeoutError):
        store.delete(first.retry_key)
    assert first_key not in store.client.objects
    assert report_index_key(first.retry_key) in store.client.objects
    monkeypatch.setattr(store.client, "delete_object", original_delete)
    store.delete(first.retry_key)
    assert set(store.client.objects) == {second_key, report_index_key(second.retry_key)}


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
