#!/usr/bin/env python3
"""Private developer operations; run with .venv/bin/python scripts/scan_reports.py."""

import argparse
import base64
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid4

# Direct script execution needs the repository root on the import path.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from dotenv import load_dotenv
from PIL import Image, ImageDraw

from services.scan_report_crypto import decode_key
from services.scan_report_service import AnonymousScanReport
from services.scan_report_storage import ScanReportStorageConfig, report_object_key


def _report_id(value):
    try:
        result = UUID(value)
        report_object_key(result)
        return result
    except ValueError:
        raise argparse.ArgumentTypeError("A report UUID4 is required.") from None


def _write_private(path: Path, data: bytes):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "wb") as output:
        output.write(data)


def generate_key(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    _write_private(path, base64.b64encode(os.urandom(32)) + b"\n")


def download_report(store, report_id: UUID, destination: Path) -> Path:
    # Authenticate/validate before creating output. File names never come from an upload.
    report = store.retrieve(report_id)
    directory = destination / str(report_id)
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    directory.mkdir(mode=0o700)  # Refuse an existing directory, including symlinks.
    suffix = {"image/png": "png", "application/pdf": "pdf"}[report.metadata.media_type]
    image_path, metadata_path = directory / f"scorecard.{suffix}", directory / "metadata.json"
    try:
        _write_private(image_path, report.image)
        _write_private(metadata_path, (json.dumps(report.metadata.model_dump(mode="json"), indent=2) + "\n").encode())
    except Exception:
        image_path.unlink(missing_ok=True)
        metadata_path.unlink(missing_ok=True)
        directory.rmdir()
        raise
    return directory


def smoke_check(config: ScanReportStorageConfig, store):
    """Generated card only. Test real provider semantics and remove the test report."""
    output = BytesIO()
    with Image.new("RGB", (300, 100), "white") as image:
        ImageDraw.Draw(image).text((10, 20), "Synthetic scorecard: 4 5 3", fill="black")
        exif = Image.Exif()
        exif[315] = "synthetic-author-for-removal"
        image.save(output, "PNG", exif=exif)
    item = AnonymousScanReport(image=output.getvalue(), media_type="image/png", retry_key=uuid4(),
                               category="unreadable_scores", stage="parse", http_status=422)
    try:
        if store.save_sync(item) is not True:
            raise ValueError("Synthetic report was not saved.")
        encrypted = store._get_envelope(item.retry_key)
        if item.image in encrypted or b"synthetic-author-for-removal" in encrypted:
            raise ValueError("Report was not encrypted.")
        with ThreadPoolExecutor(max_workers=2) as pool:
            if list(pool.map(store.save_sync, [item, item])) != [True, True]:
                raise ValueError("Report retries failed.")
        if store._get_envelope(item.retry_key) != encrypted:
            raise ValueError("A retry overwrote the report.")
        restored = store.retrieve(item.retry_key)
        if b"synthetic-author-for-removal" in restored.image:
            raise ValueError("Embedded metadata was retained.")
        with Image.open(BytesIO(restored.image)) as image:
            if image.size != (300, 100) or image.getexif() or image.info:
                raise ValueError("Retrieved scorecard validation failed.")
        endpoint = config.endpoint.rstrip("/")
        key = store.object_key(item.retry_key)
        if config.addressing_style == "virtual":
            url = endpoint.replace("https://", f"https://{config.bucket}.", 1) + "/" + key
        else:
            url = f"{endpoint}/{config.bucket}/{key}"
        response = httpx.get(url, timeout=15, follow_redirects=False)
        if response.status_code not in {403, 404}:
            raise ValueError("Bucket privacy check failed.")
    finally:
        # Fresh UUID, and deletion is confined to the generated test report.
        store.delete(item.retry_key)
    if item.retry_key in store.list_report_ids():
        raise ValueError("Synthetic report deletion failed.")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, help="An ignored local file containing SCAN_REPORT_* settings.")
    parser.add_argument("--key-file", type=Path, help="Use a private base64 key file instead of the environment key.")
    commands = parser.add_subparsers(dest="command", required=True)
    keygen = commands.add_parser("keygen", help="Generate a private encryption key without printing it.")
    keygen.add_argument("--output", type=Path, default=Path("secrets/scan-report-encryption.key"))
    commands.add_parser("list", help="List report UUIDs, with pagination.")
    download = commands.add_parser("download", help="Decrypt a report into generic local files.")
    download.add_argument("report_id", type=_report_id)
    download.add_argument("--output", type=Path, required=True)
    delete = commands.add_parser("delete", help="Delete exactly one selected encrypted report.")
    delete.add_argument("report_id", type=_report_id)
    delete.add_argument("--confirm", action="store_true", required=True)
    commands.add_parser("smoke", help="Verify real private storage using a generated card, then delete it.")
    args = parser.parse_args(argv)
    try:
        if args.command == "keygen":
            generate_key(args.output)
            print(f"Private key saved to {args.output}; back it up securely.")
            return 0
        if args.env_file and not load_dotenv(args.env_file, override=False):
            raise ValueError("Unable to read configuration file.")
        key = decode_key(args.key_file.read_text()) if args.key_file else None
        config = ScanReportStorageConfig.from_environment(encryption_key=key)
        store = config.create_store()
        try:
            if args.command == "list":
                for report_id in store.list_report_ids():
                    print(report_id)
            elif args.command == "download":
                directory = download_report(store, args.report_id, args.output)
                print(f"Decrypted report saved to {directory}.")
            elif args.command == "delete":
                store.delete(args.report_id)
                print("Selected report deleted.")
            elif args.command == "smoke":
                smoke_check(config, store)
                print("Private access, encryption, retries, retrieval and deletion passed.")
        finally:
            store.client.close()
        return 0
    except Exception:
        # SDK/decoder exceptions can contain credentials or private object contents.
        print("Report operation failed. Check configuration, key, permissions and output location.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
