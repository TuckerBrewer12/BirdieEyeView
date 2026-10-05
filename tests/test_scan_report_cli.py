import json
import os
from uuid import uuid4

import pytest
from PIL import Image

from scripts import scan_reports as cli
from services.scan_report_crypto import decode_key
from services.scan_report_storage import ScanReportStorageConfig
from tests.scan_report_fixtures import report
from tests.test_scan_report_storage import configure_environment, make_store


def test_key_generation_is_private_never_printed_and_cannot_overwrite(tmp_path, capsys):
    destination = tmp_path / "secrets" / "reports.key"
    assert cli.main(["keygen", "--output", str(destination)]) == 0
    secret = destination.read_text().strip()
    assert len(decode_key(secret)) == 32
    assert os.stat(destination).st_mode & 0o777 == 0o600
    assert secret not in capsys.readouterr().out
    assert cli.main(["keygen", "--output", str(destination)]) == 1
    assert destination.read_text().strip() == secret


def test_download_authenticates_then_writes_only_generic_private_files(tmp_path):
    store = make_store()
    item = report()
    store.save_sync(item)
    directory = cli.download_report(store, item.retry_key, tmp_path)
    assert directory.name == str(item.retry_key)
    assert {path.name for path in directory.iterdir()} == {"scorecard.png", "metadata.json"}
    metadata = json.loads((directory / "metadata.json").read_text())
    assert set(metadata) == {"schema_version", "retry_key", "category", "stage", "http_status", "media_type"}
    assert os.stat(directory).st_mode & 0o777 == 0o700
    assert all(os.stat(path).st_mode & 0o777 == 0o600 for path in directory.iterdir())
    with Image.open(directory / "scorecard.png") as image:
        assert image.size == (30, 20) and not image.info
    with pytest.raises(FileExistsError):
        cli.download_report(store, item.retry_key, tmp_path)


def test_invalid_ciphertext_never_creates_download_directory(tmp_path):
    store = make_store()
    item = report()
    from services.scan_report_storage import report_object_key
    store.client.objects[report_object_key(item.retry_key)] = b"bad"
    with pytest.raises(ValueError):
        cli.download_report(store, item.retry_key, tmp_path)
    assert not list(tmp_path.iterdir())


def test_download_refuses_preexisting_symlink(tmp_path):
    store = make_store()
    item = report()
    store.save_sync(item)
    (tmp_path / str(item.retry_key)).symlink_to(tmp_path, target_is_directory=True)
    with pytest.raises(FileExistsError):
        cli.download_report(store, item.retry_key, tmp_path)
    assert not (tmp_path / "scorecard.png").exists()


def cli_store(monkeypatch):
    configure_environment(monkeypatch)
    store = make_store()
    store.client.close = lambda: None
    monkeypatch.setattr(ScanReportStorageConfig, "create_store", lambda config: store)
    return store


def test_cli_list_download_and_explicit_delete_commands(tmp_path, monkeypatch, capsys):
    store = cli_store(monkeypatch)
    first, second = report(), report()
    store.save_sync(first)
    store.save_sync(second)
    assert cli.main(["list"]) == 0
    assert capsys.readouterr().out.splitlines() == [str(first.retry_key), str(second.retry_key)]
    assert cli.main(["download", str(first.retry_key), "--output", str(tmp_path)]) == 0
    assert cli.main(["delete", str(first.retry_key), "--confirm"]) == 0
    assert list(store.list_report_ids()) == [second.retry_key]


def test_cli_requires_confirmation_and_valid_uuid_for_deletion(monkeypatch):
    cli_store(monkeypatch)
    with pytest.raises(SystemExit):
        cli.main(["delete", str(uuid4())])
    with pytest.raises(SystemExit):
        cli.main(["delete", "../../private-user", "--confirm"])


def test_key_file_can_supply_key_without_an_environment_secret(tmp_path, monkeypatch):
    store = cli_store(monkeypatch)
    monkeypatch.delenv("SCAN_REPORT_ENCRYPTION_KEY")
    key = tmp_path / "key"
    cli.generate_key(key)
    received = []
    monkeypatch.setattr(ScanReportStorageConfig, "create_store", lambda config: received.append(config) or store)
    assert cli.main(["--key-file", str(key), "list"]) == 0
    assert received[0].encryption_key == decode_key(key.read_text())


def test_cli_errors_never_print_credentials_or_contents(monkeypatch, capsys):
    store = cli_store(monkeypatch)
    def fail():
        raise RuntimeError("private-user@example.com secret-storage-key")
    monkeypatch.setattr(store, "list_report_ids", fail)
    assert cli.main(["list"]) == 1
    captured = capsys.readouterr()
    assert "private-user" not in captured.out + captured.err
    assert "secret-storage-key" not in captured.out + captured.err


def test_smoke_exercises_private_storage_retries_and_cleans_synthetic_data(monkeypatch):
    store = cli_store(monkeypatch)
    config = ScanReportStorageConfig.from_environment()
    class Denied:
        status_code = 403
    urls = []
    monkeypatch.setattr(cli.httpx, "get", lambda url, **kwargs: urls.append(url) or Denied())
    cli.smoke_check(config, store)
    assert not store.client.objects and len(store.client.deleted) == 1
    assert len(store.client.writes) == 3
    assert urls[0].startswith("https://private-test.storage.invalid/reports/v1/")


def test_smoke_fails_on_public_access_and_still_cleans_test_report(monkeypatch):
    store = cli_store(monkeypatch)
    class Public:
        status_code = 200
    monkeypatch.setattr(cli.httpx, "get", lambda *args, **kwargs: Public())
    with pytest.raises(ValueError, match="privacy"):
        cli.smoke_check(ScanReportStorageConfig.from_environment(), store)
    assert not store.client.objects
