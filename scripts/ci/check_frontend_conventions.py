#!/usr/bin/env python3
"""Structural checks on the frontend's kit and refactored pages.

The brand kit and the MVVM pages only stay trustworthy if every piece comes
with its coverage: a kit component with no preview or screenshot spec can
change its look without failing anything, a page with no robot/screenshot/
espresso trio has no pinned look or behaviour, and a view model with no
Vitest test has no pinned logic. Reviews kept catching these one PR at a time
(#148, #185, #188, #287), along with Playwright specs that don't say whether
they test look or behaviour, and a second kit file exporting a component name
that already existed (#332). They are cheap to check from the file tree.

Checks:
  1. Every kit component brand/components/X.tsx and chart brand/charts/X.tsx
     (a PascalCase .tsx file, not a test) has brand/previews/<kind>/X.tsx and
     brand/tests/screenshots/<kind>/X.screenshot.spec.ts.
  2. Every refactored page src/pages/<dir>/**/XPage.tsx has a sibling tests/
     folder with XPage.robot.ts, XPage.screenshot.spec.ts and
     XPage.espresso.spec.ts. (Legacy top-level src/pages/*.tsx are skipped.)
  3. Every src/pages/**/useXViewModel.ts(x) has a Vitest test named
     useXViewModelTest.ts(x) or useXViewModel.test.ts(x) in the same page
     folder (src/pages/<dir>/**).
  4. Every *.spec.ts(x) under src/ is a .screenshot.spec.ts (look) or an
     .espresso.spec.ts (behaviour); no Playwright project matches anything else.
  5. No two files under src/brand/ export a component with the same name.
"""
from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "frontend" / "src"

KIT_KINDS = ("components", "charts")
COMPONENT_FILE_RE = re.compile(r"^[A-Z][A-Za-z0-9]*\.tsx$")
PAGE_FILE_RE = re.compile(r"^[A-Z][A-Za-z0-9]*Page\.tsx$")
VIEW_MODEL_FILE_RE = re.compile(r"^(use[A-Z][A-Za-z0-9]*ViewModel)\.tsx?$")
SPEC_KINDS = (".screenshot.spec.ts", ".espresso.spec.ts")

# A component name: starts upper-case and has a lower-case letter, so
# SCREAMING_CASE constants are not counted.
COMPONENT_NAME_RE = re.compile(r"^[A-Z](?=.*[a-z])[A-Za-z0-9]*$")
COMMENT_RE = re.compile(r"/\*.*?\*/|//[^\n]*", re.DOTALL)
DECLARED_EXPORT_RE = re.compile(
    r"\bexport\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)"
)
EXPORT_LIST_RE = re.compile(r"\bexport\s*\{([^}]*)\}(\s*from\b)?")


def rel(path: Path, src: Path) -> str:
    return f"frontend/src/{path.relative_to(src).as_posix()}"


def is_test_file(path: Path) -> bool:
    name = path.name
    return ".test." in name or ".spec." in name or re.search(r"Test\.tsx?$", name) is not None


def check_kit_coverage(src: Path) -> list[str]:
    errors: list[str] = []
    brand = src / "brand"
    for kind in KIT_KINDS:
        for component in sorted((brand / kind).glob("*.tsx")):
            if not COMPONENT_FILE_RE.match(component.name) or is_test_file(component):
                continue
            name = component.stem
            preview = brand / "previews" / kind / f"{name}.tsx"
            screenshot = brand / "tests" / "screenshots" / kind / f"{name}.screenshot.spec.ts"
            for needed, what in ((preview, "preview"), (screenshot, "screenshot spec")):
                if not needed.exists():
                    errors.append(
                        f"{rel(component, src)}: kit {kind[:-1]} has no {what} ({rel(needed, src)}), "
                        f"so its look is not pinned by any screenshot."
                    )
    return errors


def check_page_tests(src: Path) -> list[str]:
    errors: list[str] = []
    pages = src / "pages"
    for page in sorted(pages.glob("*/**/*.tsx")):
        if not PAGE_FILE_RE.match(page.name) or "tests" in page.relative_to(pages).parts:
            continue
        tests = page.parent / "tests"
        for suffix, what in (
            (".robot.ts", "screen robot"),
            (".screenshot.spec.ts", "screenshot spec (look)"),
            (".espresso.spec.ts", "espresso spec (behaviour)"),
        ):
            needed = tests / f"{page.stem}{suffix}"
            if not needed.exists():
                errors.append(f"{rel(page, src)}: page has no {what} at {rel(needed, src)}.")
    return errors


def check_view_model_tests(src: Path) -> list[str]:
    errors: list[str] = []
    pages = src / "pages"
    for hook in sorted(pages.rglob("use*ViewModel.ts*")):
        m = VIEW_MODEL_FILE_RE.match(hook.name) if hook.is_file() else None
        if not m:
            continue
        name = m.group(1)
        page_dir = pages / hook.relative_to(pages).parts[0]
        accepted = {f"{name}Test.tsx", f"{name}Test.ts", f"{name}.test.tsx", f"{name}.test.ts"}
        if not any(p.name in accepted for p in page_dir.rglob(f"{name}*")):
            errors.append(
                f"{rel(hook, src)}: view model has no Vitest test "
                f"(expected tests/{name}Test.tsx under {rel(page_dir, src)}/)."
            )
    return errors


def check_spec_kinds(src: Path) -> list[str]:
    errors: list[str] = []
    for spec in sorted(src.rglob("*.spec.ts*")):
        if not spec.is_file() or spec.suffix not in (".ts", ".tsx") or spec.name.endswith(SPEC_KINDS):
            continue
        errors.append(
            f"{rel(spec, src)}: a spec must be .screenshot.spec.ts (look only) or "
            f".espresso.spec.ts (behaviour only). No Playwright project matches "
            f"this name, so it never runs in a browser."
        )
    return errors


def exported_components(path: Path) -> set[str]:
    body = COMMENT_RE.sub("", path.read_text())
    names = set(DECLARED_EXPORT_RE.findall(body))
    for listed, reexport in EXPORT_LIST_RE.findall(body):
        if reexport:
            continue
        for item in listed.split(","):
            item = item.strip()
            if not item or item.startswith("type "):
                continue
            names.add(item.split(" as ")[-1].strip())
    return {n for n in names if COMPONENT_NAME_RE.match(n)}


def check_unique_kit_exports(src: Path) -> list[str]:
    owners: dict[str, list[Path]] = defaultdict(list)
    for path in sorted((src / "brand").rglob("*.ts*")):
        if not path.is_file() or path.suffix not in (".ts", ".tsx") or is_test_file(path) or "tests" in path.parts:
            continue
        for name in exported_components(path):
            owners[name].append(path)
    return [
        f"kit component name `{name}` is exported by more than one file: "
        + ", ".join(rel(p, src) for p in paths)
        + ". Extend the existing component or pick a distinct name."
        for name, paths in sorted(owners.items())
        if len(paths) > 1
    ]


CHECKS = (
    check_kit_coverage,
    check_page_tests,
    check_view_model_tests,
    check_spec_kinds,
    check_unique_kit_exports,
)


def find_problems(src: Path = SRC) -> list[str]:
    return [problem for check in CHECKS for problem in check(src)]


def main() -> int:
    errors = find_problems()

    for err in errors:
        print(f"::error file=frontend/src::{err}")

    if errors:
        print(f"\n{len(errors)} frontend convention problem(s) found.", file=sys.stderr)
        return 1

    print(f"OK: {len(CHECKS)} frontend convention checks pass.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
