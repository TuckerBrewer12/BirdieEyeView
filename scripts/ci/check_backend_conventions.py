#!/usr/bin/env python3
"""Backend conventions ruff can't express, each from a mistake that shipped.

1. Exception text in HTTPException detail. `detail=str(e)` or an f-string that
   interpolates the caught exception sends internal error text (SQL, file
   paths, library messages) to the client (f2092b9, #147). Raise a fixed,
   user-facing message and log the exception server-side instead.

2. Hard-coded hole counts. Comparing a hole count against 9/18, assigning
   `hole_count = 18`, or looping `range(1, 19)` bakes in "every round is 18
   holes"; that broke 9-hole scorecards (PR #284). Use a named constant and
   handle both round lengths.
"""
from __future__ import annotations

import ast
import sys
from collections.abc import Iterator
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCAN_DIRS = ["api", "services", "database", "analytics", "models"]
# Standalone demo/plotting scripts that fabricate 18-hole sample data.
SKIP_GLOBS = ["analytics/demo.py", "analytics/visualize*.py"]

HOLE_COUNTS = {9, 18}
# No hole-count constant exists yet; this is where one should live.
CONSTANT_HINT = (
    "use a named constant (add HOLES_PER_ROUND = 18 / HOLES_PER_NINE = 9 to a "
    "module in models/) and make sure 9-hole rounds still work (PR #284)"
)

# (start, stop) pairs for range() that walk a nine or a full round of holes.
HOLE_RANGES = {
    (0, 9), (1, 10), (9, 18), (10, 19),
    (0, 18), (1, 19),
}

Finding = tuple[int, str]


# --- 1. exception text leaked through HTTPException ------------------------


def _is_http_exception(call: ast.Call) -> bool:
    func = call.func
    if isinstance(func, ast.Name):
        return func.id == "HTTPException"
    return isinstance(func, ast.Attribute) and func.attr == "HTTPException"


def _detail_arg(call: ast.Call) -> ast.expr | None:
    for kw in call.keywords:
        if kw.arg == "detail":
            return kw.value
    return call.args[1] if len(call.args) >= 2 else None


def _root_name(expr: ast.expr) -> str | None:
    """`e` for `e`, `e.args`, `e.args[0]`, `e.message`."""
    while isinstance(expr, (ast.Attribute, ast.Subscript)):
        expr = expr.value
    return expr.id if isinstance(expr, ast.Name) else None


def _references(expr: ast.expr, names: set[str]) -> bool:
    return any(isinstance(n, ast.Name) and n.id in names for n in ast.walk(expr))


def _leaks_exception(detail: ast.expr, exc_names: set[str]) -> bool:
    """True if `detail` contains str(e)/repr(e) or an f-string field using e."""
    for node in ast.walk(detail):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id in {"str", "repr"}
            and len(node.args) == 1
            and _root_name(node.args[0]) in exc_names
        ):
            return True
        if isinstance(node, ast.FormattedValue) and _references(node.value, exc_names):
            return True
    return False


class _LeakVisitor(ast.NodeVisitor):
    """Walks except blocks, tracking the `as <name>` bindings in scope."""

    def __init__(self) -> None:
        self.exc_names: list[str] = []
        self.findings: list[Finding] = []

    def visit_ExceptHandler(self, node: ast.ExceptHandler) -> None:
        if node.name:
            self.exc_names.append(node.name)
        self.generic_visit(node)
        if node.name:
            self.exc_names.pop()

    def visit_Call(self, node: ast.Call) -> None:
        if self.exc_names and _is_http_exception(node):
            detail = _detail_arg(node)
            if detail is not None and _leaks_exception(detail, set(self.exc_names)):
                self.findings.append((
                    node.lineno,
                    "HTTPException detail includes the caught exception's text, which leaks "
                    "internals to the client (f2092b9, #147). Use a fixed user-facing message "
                    "and log the exception instead.",
                ))
        self.generic_visit(node)


# --- 2. hard-coded hole counts ----------------------------------------------


def _int_const(expr: ast.expr) -> int | None:
    if isinstance(expr, ast.Constant) and type(expr.value) is int:
        return expr.value
    return None


def _mentions_hole(expr: ast.expr) -> bool:
    """A name/attribute about holes, or len(<anything>)."""
    if isinstance(expr, ast.Name):
        return "hole" in expr.id.lower()
    if isinstance(expr, ast.Attribute):
        return "hole" in expr.attr.lower() or _mentions_hole(expr.value)
    if isinstance(expr, ast.Call):
        func = expr.func
        return isinstance(func, ast.Name) and func.id == "len"
    return False


def _hole_count_findings(tree: ast.AST) -> Iterator[Finding]:
    for node in ast.walk(tree):
        # Comparisons: `holes_played == 18`, `len(self.holes) != 18`, `1 <= hole_num <= 18`.
        if isinstance(node, ast.Compare):
            operands = [node.left, *node.comparators]
            counts = [_int_const(op) for op in operands]
            if any(c in HOLE_COUNTS for c in counts) and any(
                c is None and _mentions_hole(op) for c, op in zip(counts, operands, strict=True)
            ):
                literal = next(c for c in counts if c in HOLE_COUNTS)
                yield node.lineno, f"comparison against hard-coded hole count {literal}; {CONSTANT_HINT}."

        # Assignments: `hole_count = 18`, `num_holes: int = 9`.
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            value = _int_const(node.value) if node.value is not None else None
            if value in HOLE_COUNTS and any(
                isinstance(t, ast.Name) and "hole" in t.id.lower() for t in targets
            ):
                yield node.lineno, f"hole count hard-coded as {value}; {CONSTANT_HINT}."

        # Loops over holes: `range(18)`, `range(1, 19)`, `range(10, 19)`.
        elif (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "range"
            and not node.keywords
        ):
            args = [_int_const(a) for a in node.args]
            if None in args:
                continue
            if (len(args) == 1 and args[0] in HOLE_COUNTS) or (len(args) == 2 and tuple(args) in HOLE_RANGES):
                shown = ", ".join(str(a) for a in args)
                yield node.lineno, f"range({shown}) walks a hard-coded set of holes; {CONSTANT_HINT}."


# --- driver -----------------------------------------------------------------


def check_source(source: str, filename: str = "<string>") -> list[Finding]:
    tree = ast.parse(source, filename=filename)
    leaks = _LeakVisitor()
    leaks.visit(tree)
    return sorted(leaks.findings + list(_hole_count_findings(tree)))


def main() -> int:
    total = 0
    for directory in SCAN_DIRS:
        for path in sorted((ROOT / directory).rglob("*.py")):
            rel = path.relative_to(ROOT)
            if any(rel.match(glob) for glob in SKIP_GLOBS):
                continue
            try:
                findings = check_source(path.read_text(), filename=str(rel))
            except SyntaxError:
                continue
            for lineno, message in findings:
                print(f"{rel}:{lineno}: {message}")
            total += len(findings)

    if total:
        print(f"\n{total} backend convention violation(s).", file=sys.stderr)
        return 1

    print("OK: no leaked exception text or hard-coded hole counts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
