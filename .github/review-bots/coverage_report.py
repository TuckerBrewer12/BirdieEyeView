#!/usr/bin/env python3
"""Frontend coverage comment: Vitest changed-line % plus AI screen counts.

Subcommands:
    lines      coverage-final.json + diff → JSON {covered, executable, files}
    inventory  scan frontend/src for screenshot and espresso test titles
    comment    upsert the sticky PR comment
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")
TEST_TITLE = re.compile(r"""^\s*(?:test|it)\(\s*(?:'([^'\\]*)'|"([^"\\]*)")""", re.M)
MARKER = "<!-- frontend-coverage-bot -->"

PRODUCTION_PREFIX = "frontend/src/"
SKIP_DIR_PARTS = ("/testing/", "/previews/", "/brand/tests/", "/tests/")
SKIP_SUFFIXES = (
    ".test.ts",
    ".test.tsx",
    "Test.ts",
    "Test.tsx",
    ".screenshot.spec.ts",
    ".espresso.spec.ts",
    ".spec.ts",
    ".spec.tsx",
)
SOURCE_SUFFIXES = (".ts", ".tsx")


def is_production(path: str) -> bool:
    if not path.startswith(PRODUCTION_PREFIX):
        return False
    if not path.endswith(SOURCE_SUFFIXES):
        return False
    if any(part in f"/{path}" for part in SKIP_DIR_PARTS):
        return False
    return not path.endswith(SKIP_SUFFIXES)


def skip_as_non_executable(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    if stripped.startswith(("//", "*", "/*", "*/")):
        return True
    if stripped.startswith(("import ", "export type ", "export interface ", "type ", "interface ")):
        return True
    return stripped.startswith("export {") and " from " in stripped


def added_source(diff: str) -> dict[str, dict[int, str]]:
    """Map path -> {new-file line number: added text}."""
    out: dict[str, dict[int, str]] = {}
    path: str | None = None
    lineno = 0

    for raw in diff.splitlines():
        if raw.startswith("+++ b/"):
            path = raw[6:]
            out.setdefault(path, {})
        elif raw.startswith("@@"):
            match = HUNK.match(raw)
            if match:
                lineno = int(match.group(1))
        elif path and raw.startswith("+"):
            out[path][lineno] = raw[1:]
            lineno += 1
        elif path and (raw.startswith(" ") or raw == ""):
            lineno += 1

    return out


def repo_relative(path: str, repo: Path) -> str:
    candidate = Path(path)
    try:
        resolved = candidate.resolve()
        return str(resolved.relative_to(repo.resolve())).replace("\\", "/")
    except ValueError:
        return str(candidate).replace("\\", "/")


def coverage_lines(file_cov: dict) -> tuple[set[int], set[int]]:
    """Executable and covered line numbers from an Istanbul file record."""
    executable: set[int] = set()
    covered: set[int] = set()

    statement_map = file_cov.get("statementMap") or {}
    hits = file_cov.get("s") or {}
    for sid, span in statement_map.items():
        start = (span or {}).get("start", {}).get("line")
        if not isinstance(start, int):
            continue
        executable.add(start)
        hit = hits.get(sid, hits.get(str(sid), 0))
        if hit:
            covered.add(start)

    for line, count in (file_cov.get("l") or {}).items():
        executable.add(int(line))
        if count:
            covered.add(int(line))

    return executable, covered


def compute_lines(coverage_path: Path | None, diff: str, repo: Path) -> dict:
    added = added_source(diff)
    coverage_by_file: dict[str, dict] = {}
    if coverage_path and coverage_path.is_file():
        raw = json.loads(coverage_path.read_text())
        for abs_path, record in raw.items():
            coverage_by_file[repo_relative(abs_path, repo)] = record

    files: list[dict] = []
    covered_n = 0
    executable_n = 0

    for path, lines in sorted(added.items()):
        if not is_production(path):
            continue
        record = coverage_by_file.get(path)
        if record:
            executable, covered = coverage_lines(record)
            file_exec = sorted(n for n in lines if n in executable)
            file_hit = [n for n in file_exec if n in covered]
            file_miss = [n for n in file_exec if n not in covered]
        else:
            file_exec = sorted(n for n, text in lines.items() if not skip_as_non_executable(text))
            file_hit = []
            file_miss = file_exec

        if not file_exec:
            continue
        executable_n += len(file_exec)
        covered_n += len(file_hit)
        files.append(
            {
                "path": path,
                "executable": len(file_exec),
                "covered": len(file_hit),
                "uncovered_lines": file_miss[:20],
            }
        )

    pct = round(100 * covered_n / executable_n) if executable_n else None
    return {
        "covered": covered_n,
        "executable": executable_n,
        "percent": pct,
        "coverage_available": bool(coverage_by_file),
        "files": files,
    }


def inventory_markdown(src_root: Path) -> str:
    sections = [
        ("Screenshot specs (`*.screenshot.spec.ts`)", list(src_root.rglob("*.screenshot.spec.ts"))),
        ("Espresso specs (`*.espresso.spec.ts`)", list(src_root.rglob("*.espresso.spec.ts"))),
    ]
    parts: list[str] = []
    for heading, paths in sections:
        parts.append(f"### {heading}")
        if not paths:
            parts.append("_None._")
            continue
        for path in sorted(paths):
            rel = path.as_posix()
            if "frontend/src/" in rel:
                rel = rel[rel.index("frontend/src/") :]
            elif src_root.name == "src":
                rel = f"frontend/src/{path.relative_to(src_root).as_posix()}"
            titles = [m.group(1) or m.group(2) for m in TEST_TITLE.finditer(path.read_text())]
            parts.append(f"- `{rel}`")
            for title in titles:
                parts.append(f"  - {title}")
        parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def extract_object(text: str) -> str:
    """Pull the first balanced JSON object out of model stdout."""
    start = text.find("{")
    if start == -1:
        return ""

    depth = 0
    in_string = False
    escaped = False

    for i, ch in enumerate(text[start:], start):
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return ""


def parse_layer(raw: object, key: str) -> dict:
    layer = raw.get(key) if isinstance(raw, dict) else None
    if not isinstance(layer, dict):
        return {"reasonable": 0, "covered": 0, "items": [], "ok": False}

    items_in = layer.get("items") or []
    items: list[dict] = []
    if isinstance(items_in, list):
        for item in items_in:
            if not isinstance(item, dict) or not item.get("name"):
                continue
            items.append(
                {
                    "name": str(item["name"]),
                    "covered": bool(item.get("covered")),
                    "note": str(item["note"]) if item.get("note") else "",
                }
            )

    reasonable = layer.get("reasonable")
    covered = layer.get("covered")
    if not isinstance(reasonable, int):
        reasonable = len(items)
    if not isinstance(covered, int):
        covered = sum(1 for item in items if item["covered"])
    return {"reasonable": reasonable, "covered": covered, "items": items, "ok": True}


def parse_ai(text: str) -> dict:
    blob = extract_object(text)
    if not blob:
        return {"screenshots": parse_layer({}, "screenshots"), "espresso": parse_layer({}, "espresso")}
    try:
        data = json.loads(blob)
    except json.JSONDecodeError:
        data = {}
    return {
        "screenshots": parse_layer(data, "screenshots"),
        "espresso": parse_layer(data, "espresso"),
    }


def fmt_layer(title: str, layer: dict, noun: str) -> list[str]:
    if not layer["ok"]:
        return [f"**{title}:** AI review unavailable."]
    if layer["reasonable"] == 0:
        return [f"**{title}:** n/a — no reasonable {noun} in this diff."]
    lines = [
        f"**{title}:** {layer['covered']} / {layer['reasonable']} reasonable {noun}"
    ]
    for item in layer["items"]:
        mark = "✅" if item["covered"] else "❌"
        extra = f" — {item['note']}" if item["note"] else ""
        lines.append(f"- {mark} {item['name']}{extra}")
    return lines


def render_comment(lines: dict, ai: dict) -> str:
    executable = lines.get("executable") or 0
    covered = lines.get("covered") or 0
    percent = lines.get("percent")
    if not lines.get("coverage_available"):
        unit = "unavailable (Vitest coverage did not run)."
    elif executable == 0:
        unit = "n/a — no executable production lines in this diff."
    else:
        unit = f"{covered} / {executable} changed lines (**{percent}%**)"

    body = [
        MARKER,
        "### 🧪 Frontend test coverage",
        "",
        "Report for this PR's frontend diff. Not a merge gate.",
        "",
        f"**Unit (Vitest):** {unit}",
        "",
        *fmt_layer("Screenshots", ai["screenshots"], "screens"),
        "",
        *fmt_layer("Espresso", ai["espresso"], "flows"),
        "",
        "<sub>Unit % is changed production lines hit by Vitest. Screenshot and espresso counts are an AI judgment of reasonable screens this diff touches — light+dark or desktop+mobile is one screen. UI Test Checker still flags missing tests as review comments.</sub>",
    ]
    return "\n".join(body) + "\n"


def gh_api(args: list[str], *, input_text: str | None = None) -> str:
    result = subprocess.run(
        ["gh", "api", *args],
        input=input_text,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise SystemExit(result.returncode)
    return result.stdout


def upsert_comment(body: str) -> None:
    repo = os.environ["GITHUB_REPOSITORY"]
    pr = os.environ["PR_NUMBER"]
    raw = gh_api(["--paginate", f"repos/{repo}/issues/{pr}/comments"])
    comments = json.loads(raw) if raw.strip() else []
    existing = next((c for c in comments if MARKER in (c.get("body") or "")), None)

    payload = json.dumps({"body": body})
    if existing:
        gh_api(
            [
                "-X",
                "PATCH",
                f"repos/{repo}/issues/comments/{existing['id']}",
                "--input",
                "-",
            ],
            input_text=payload,
        )
        print(f"Updated comment {existing['id']}.")
    else:
        gh_api(
            [
                "-X",
                "POST",
                f"repos/{repo}/issues/{pr}/comments",
                "--input",
                "-",
            ],
            input_text=payload,
        )
        print("Posted coverage comment.")


def cmd_lines(args: argparse.Namespace) -> int:
    diff = Path(args.diff).read_text()
    coverage = Path(args.coverage) if args.coverage else None
    repo = Path(args.repo)
    json.dump(compute_lines(coverage, diff, repo), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


def cmd_inventory(args: argparse.Namespace) -> int:
    sys.stdout.write(inventory_markdown(Path(args.root)))
    return 0


def cmd_comment(args: argparse.Namespace) -> int:
    lines = json.loads(Path(args.lines).read_text())
    if args.ai and Path(args.ai).is_file() and Path(args.ai).stat().st_size:
        ai = parse_ai(Path(args.ai).read_text())
    else:
        ai = parse_ai("")
    upsert_comment(render_comment(lines, ai))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    lines = sub.add_parser("lines")
    lines.add_argument("--coverage")
    lines.add_argument("--diff", required=True)
    lines.add_argument("--repo", required=True)
    lines.set_defaults(func=cmd_lines)

    inv = sub.add_parser("inventory")
    inv.add_argument("--root", required=True)
    inv.set_defaults(func=cmd_inventory)

    comment = sub.add_parser("comment")
    comment.add_argument("--lines", required=True)
    comment.add_argument("--ai")
    comment.set_defaults(func=cmd_comment)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
