"""Validate and archive public scan-evaluation data. Standard library only; no app imports.

The data branch contains JSON, never executable input. Version 1 is intentionally strict so
malformed artifacts cannot become misleading dashboard history.
"""

from __future__ import annotations

import argparse
import base64
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path

MAX_BYTES = 2 * 1024 * 1024
# Only for the data branch README link; GITHUB_REPOSITORY wins in Actions, so a rename needs no change here.
REPOSITORY = os.environ.get("GITHUB_REPOSITORY") or "TuckerBrewer12/BirdieEyeView"
RUN_URL = re.compile(r"https://github\.com/[A-Za-z0-9-]{1,39}/[A-Za-z0-9._-]{1,100}/actions/runs/[0-9]+")
SUMMARY_KEYS = {
    "images", "cases", "matched_cells", "total_cells", "perfect", "at_least_90", "at_least_80",
    "failed", "operational_errors", "known_gaps", "merge_rejected_images", "suite_seconds",
}
RUN_KEYS = {"id", "suite", "created_at", "branch", "commit", "head_commit", "pr", "run_url", "models", "dirty"}
CASE_KEYS = {
    "id", "image", "player", "fingerprint", "status", "matched_cells", "total_cells", "known_gap",
    "operational_error", "extraction_seconds", "effective_seconds", "mismatches", "diagnostics",
}


class ResultsError(ValueError):
    """An invalid or conflicting result, with no artifact content in the error message."""


def require(condition, path):
    if not condition:
        raise ResultsError(f"Invalid {path}")


def shape(value, keys, path):
    require(isinstance(value, dict) and set(value) == keys, path)


def text(value, path, *, nullable=False):
    if nullable and value is None:
        return
    require(isinstance(value, str) and 0 < len(value) <= 500, path)
    require(not any(ord(c) < 32 and c not in "\n\t\r" for c in value), path)


def number(value, path, *, integer=False):
    require(type(value) is int if integer else type(value) in (int, float), path)
    require(0 <= value <= 1_000_000_000 and math.isfinite(value), path)


def sequence(value, path, maximum):
    require(isinstance(value, list) and len(value) <= maximum, path)


def diagnostics(value, path):
    sequence(value, path, 200)
    for line in value:
        text(line, path)


def status(case):
    if case["operational_error"] is not None:
        return "ERROR"
    matched, total = case["matched_cells"], case["total_cells"]
    for threshold, label in ((100, "PERFECT"), (90, "90%+"), (80, "80%+")):
        if total and matched * 100 >= total * threshold:
            return label
    return "FAILED"


def aggregate(cases, images, suite_seconds):
    """Reconcile exported totals and derive the known-gap-filtered index summary."""
    used = {case["image"] for case in cases}
    images = [image for image in images if image["image"] in used]
    meets = lambda case, percent: case["status"] != "ERROR" and case["total_cells"] > 0 and (
        case["matched_cells"] * 100 >= case["total_cells"] * percent
    )
    at_80 = sum(meets(c, 80) for c in cases)
    return {
        "images": len(images), "cases": len(cases),
        "matched_cells": sum(c["matched_cells"] for c in cases),
        "total_cells": sum(c["total_cells"] for c in cases),
        "perfect": sum(meets(c, 100) for c in cases), "at_least_90": sum(meets(c, 90) for c in cases),
        "at_least_80": at_80, "failed": len(cases) - at_80,
        "operational_errors": sum(c["status"] == "ERROR" for c in cases),
        "known_gaps": sum(c["known_gap"] is not None for c in cases),
        "merge_rejected_images": sum(any("table merge rejected" in d or "table merge failed" in d
                                         for d in image["diagnostics"]) for image in images),
        "suite_seconds": suite_seconds,
    }


def validate(payload):
    shape(payload, {"schema_version", "run", "summary", "images", "cases"}, "results")
    require(type(payload["schema_version"]) is int and payload["schema_version"] == 1, "schema_version")
    run = payload["run"]
    shape(run, RUN_KEYS, "run")
    require(run["dirty"] is None or type(run["dirty"]) is bool, "run.dirty")
    text(run["id"], "run.id")
    require(re.fullmatch(r"[A-Za-z0-9._-]{1,64}", run["id"]) is not None, "run.id")
    require(run["suite"] in ("quick", "large"), "run.suite")
    text(run["created_at"], "run.created_at")
    require(re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z", run["created_at"]) is not None,
            "run.created_at")
    try:
        datetime.fromisoformat(run["created_at"].replace("Z", "+00:00"))
    except ValueError as error:
        raise ResultsError("Invalid run.created_at") from error
    text(run["branch"], "run.branch", nullable=True)
    for key in ("commit", "head_commit"):
        value = run[key]
        require(value is None or (isinstance(value, str) and re.fullmatch(r"[0-9a-fA-F]{40}", value)), f"run.{key}")
    if run["pr"] is not None:
        number(run["pr"], "run.pr", integer=True)
        require(run["pr"] > 0, "run.pr")
    url = run["run_url"]
    text(url, "run.run_url", nullable=True)
    require(url is None or (isinstance(url, str) and RUN_URL.fullmatch(url) is not None), "run.run_url")
    shape(run["models"], {"ocr", "merge"}, "run.models")
    for key, value in run["models"].items():
        text(value, f"run.models.{key}")
    shape(payload["summary"], SUMMARY_KEYS, "summary")
    for key, value in payload["summary"].items():
        number(value, f"summary.{key}", integer=key != "suite_seconds")
    sequence(payload["images"], "images", 100)
    image_ids = set()
    for image in payload["images"]:
        shape(image, {"image", "ocr_seconds", "diagnostics"}, "image")
        text(image["image"], "image.image")
        require(image["image"] not in image_ids, "images: duplicate identity")
        image_ids.add(image["image"])
        number(image["ocr_seconds"], "image.ocr_seconds")
        diagnostics(image["diagnostics"], "image.diagnostics")
    sequence(payload["cases"], "cases", 100)
    require(bool(payload["cases"]), "cases: empty")
    ids = set()
    for case in payload["cases"]:
        shape(case, CASE_KEYS, "case")
        for key in ("id", "image", "player"):
            text(case[key], f"case.{key}")
        require(case["id"] not in ids, "cases: duplicate identity")
        ids.add(case["id"])
        require(case["image"] in image_ids, "case.image")
        require(isinstance(case["fingerprint"], str) and re.fullmatch(r"[0-9a-f]{64}", case["fingerprint"]),
                "case.fingerprint")
        for key in ("matched_cells", "total_cells"):
            number(case[key], f"case.{key}", integer=True)
        require(0 < case["total_cells"] <= 54 and case["matched_cells"] <= case["total_cells"], "case.cells")
        for key in ("known_gap", "operational_error"):
            text(case[key], f"case.{key}", nullable=True)
        for key in ("extraction_seconds", "effective_seconds"):
            number(case[key], f"case.{key}")
        require(case["effective_seconds"] >= case["extraction_seconds"], "case.effective_seconds")
        require(case["status"] == status(case), "case.status")
        if case["operational_error"] is not None:
            require(case["matched_cells"] == 0, "case.error matches")
        sequence(case["mismatches"], "case.mismatches", 54)
        seen = set()
        for cell in case["mismatches"]:
            shape(cell, {"field", "hole", "expected", "actual"}, "mismatch")
            require(cell["field"] in ("strokes", "putts", "shots_to_green"), "mismatch.field")
            require(type(cell["hole"]) is int and 1 <= cell["hole"] <= 18, "mismatch.hole")
            identity = (cell["field"], cell["hole"])
            require(identity not in seen, "mismatches: duplicate cell")
            seen.add(identity)
            require(type(cell["expected"]) is int and abs(cell["expected"]) <= 1000, "mismatch.expected")
            require(cell["actual"] is None or (type(cell["actual"]) is int and abs(cell["actual"]) <= 1000),
                    "mismatch.actual")
            require(cell["expected"] != cell["actual"], "mismatch: equal values")
        require(len(case["mismatches"]) == (0 if case["status"] == "ERROR" else
                                          case["total_cells"] - case["matched_cells"]), "case.mismatch count")
        diagnostics(case["diagnostics"], "case.diagnostics")
    require(image_ids == {c["image"] for c in payload["cases"]}, "images: unused image")
    require(payload["summary"] == aggregate(payload["cases"], payload["images"], payload["summary"]["suite_seconds"]),
            "summary: inconsistent totals")
    require(len(encode(payload)) <= MAX_BYTES, "results: size limit")
    return payload


def encode(payload):
    return (json.dumps(payload, ensure_ascii=False, indent=1, sort_keys=True, allow_nan=False) + "\n").encode("utf-8")


def _unique_keys(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "JSON: duplicate key")
        result[key] = value
    return result


def load(path):
    path = Path(path)
    require(not path.is_symlink() and path.is_file(), "results file")
    require(path.stat().st_size <= MAX_BYTES, "results: size limit")
    try:
        with path.open("rb") as source:
            data = source.read(MAX_BYTES + 1)
        require(len(data) <= MAX_BYTES, "results: size limit")
        return validate(json.loads(data, object_pairs_hook=_unique_keys))
    except (ValueError, UnicodeError, RecursionError) as error:
        raise ResultsError("Invalid results JSON") from error


def run_filename(payload):
    validate(payload)
    return f"runs/{payload['run']['created_at'][:10]}-{payload['run']['suite']}-{payload['run']['id']}.json"


def _entries(runs_dir):
    directory = Path(runs_dir)
    require(not directory.is_symlink(), "runs directory")
    entries, ids = [], set()
    for path in sorted(directory.glob("*.json")):
        payload = load(path)
        require(path.name == Path(run_filename(payload)).name, "archive filename")
        require(payload["run"]["id"] not in ids, "archive: duplicate run id")
        ids.add(payload["run"]["id"])
        entries.append({"file": f"runs/{path.name}", "run": payload["run"], "summary": payload["summary"],
                        "without_known_gaps": aggregate([c for c in payload["cases"] if not c["known_gap"]],
                                                        payload["images"], payload["summary"]["suite_seconds"])})
    return entries


def build_index(runs_dir):
    entries = _entries(runs_dir)
    entries.sort(key=lambda entry: (datetime.fromisoformat(entry["run"]["created_at"].replace("Z", "+00:00")),
                                    entry["run"]["id"]), reverse=True)
    return {"schema_version": 1, "runs": entries}


def _atomic_write(path, data):
    require(not path.is_symlink(), "archive destination")
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=path.parent, prefix=".eval-")
    try:
        with os.fdopen(fd, "wb") as output:
            output.write(data)
        os.replace(name, path)
    finally:
        Path(name).unlink(missing_ok=True)


def add(payload, repo_dir):
    validate(payload)
    root = Path(repo_dir)
    index = build_index(root / "runs")  # validate every old file before mutating anything
    name = run_filename(payload)
    for entry in index["runs"]:
        if entry["run"]["id"] == payload["run"]["id"]:
            require(entry["file"] == name and load(root / name) == payload, "archive: conflicting run id")
    require(not (root / "index.json").is_symlink() and not (root / "README.md").is_symlink(), "archive metadata")
    _atomic_write(root / name, encode(payload))
    _atomic_write(root / "index.json", encode(build_index(root / "runs")))
    if not (root / "README.md").exists():
        source_ref = payload["run"]["commit"] or "backend-refactor"
        _atomic_write(root / "README.md", (
            "# Public scan evaluation history\n\nJSON reports for public evaluation fixtures only; never upload user scans.\n\n"
            f"See [dashboard instructions](https://github.com/{REPOSITORY}/blob/{source_ref}/eval-dashboard/README.md).\n"
        ).encode())


def check_workflow_metadata(payload, environment):
    for field, variable in (("id", "SCAN_EVAL_RUN_ID"), ("branch", "SCAN_EVAL_BRANCH"),
                            ("commit", "SCAN_EVAL_COMMIT"), ("head_commit", "SCAN_EVAL_HEAD_COMMIT"),
                            ("run_url", "SCAN_EVAL_RUN_URL")):
        if environment.get(variable):
            require(payload["run"][field] == environment[variable], f"workflow {field}")
    if environment.get("SCAN_EVAL_PR"):
        require(str(payload["run"]["pr"]) == environment["SCAN_EVAL_PR"], "workflow pr")
    if environment.get("SCAN_EVAL_SUITE"):
        require(payload["run"]["suite"] == environment["SCAN_EVAL_SUITE"], "workflow suite")


def publish(payload, repo_dir, remote, *, environment=None, attempts=3):
    """Append via ordinary Git pushes; each retry restores the current data branch before adding."""
    validate(payload)
    environment = dict(os.environ if environment is None else environment)
    check_workflow_metadata(payload, environment)
    if token := environment.pop("GH_TOKEN", None):
        auth = base64.b64encode(f"x-access-token:{token}".encode()).decode()
        environment.update(GIT_CONFIG_COUNT="1", GIT_CONFIG_KEY_0="http.https://github.com/.extraheader",
                           GIT_CONFIG_VALUE_0=f"AUTHORIZATION: basic {auth}")
    root = Path(repo_dir).resolve()
    require(not root.exists(), "publish checkout: must be a new directory")
    root.mkdir(parents=True)

    def git(*args, ok=(0,)):
        result = subprocess.run(["git", *args], cwd=root, env=environment, capture_output=True, text=True, check=False)
        require(result.returncode in ok, "git " + args[0])  # do not echo token-bearing errors
        return result

    git("init", "-q")
    git("remote", "add", "origin", remote)
    git("config", "user.name", "github-actions[bot]")
    git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    for attempt in range(attempts):
        exists = git("ls-remote", "--exit-code", "--heads", "origin", "eval-results", ok=(0, 2)).returncode == 0
        if exists:
            git("fetch", "-q", "origin", "refs/heads/eval-results:refs/remotes/origin/eval-results")
            git("checkout", "-q", "-B", "eval-results", "origin/eval-results")
        else:
            git("checkout", "-q", "--orphan", "eval-results")
        add(payload, root)
        git("add", "--", "runs", "index.json", "README.md")
        if git("diff", "--cached", "--quiet", ok=(0, 1)).returncode == 0:
            return
        git("commit", "-q", "-m", f"Add {payload['run']['suite']} eval run {payload['run']['id']}")
        if git("push", "origin", "HEAD:refs/heads/eval-results", ok=(0, 1)).returncode == 0:
            return
        if attempt + 1 < attempts:
            time.sleep(attempt + 1)
    raise ResultsError("Could not publish after retries; retain the artifact and retry the job")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for command in ("add", "publish"):
        sub = commands.add_parser(command)
        sub.add_argument("--results", type=Path, required=True)
        sub.add_argument("--repo-dir", type=Path, required=True)
        if command == "publish":
            sub.add_argument("--remote", required=True)
    args = parser.parse_args(argv)
    try:
        payload = load(args.results)
        if args.command == "publish":
            publish(payload, args.repo_dir, args.remote)
        else:
            add(payload, args.repo_dir)
    except (ResultsError, OSError) as error:
        print(f"Evaluation results not saved: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
