#!/usr/bin/env python3
from __future__ import annotations

import ast
import sys
from collections.abc import Iterator
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCAN_DIRS = ["api", "services", "database", "analytics", "models"]
SKIP_GLOBS = ["analytics/demo.py", "analytics/visualize*.py"]

HOLE_COUNTS = {9, 18}
CONSTANT_HINT = (
    "use HOLES_PER_ROUND / HOLES_PER_NINE from models.hole and make sure 9-hole "
    "rounds still work (PR #284)"
)

HOLE_RANGES = {
    (0, 9), (1, 10), (9, 18), (10, 19),
    (0, 18), (1, 19),
}

Finding = tuple[int, str]


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
    while isinstance(expr, (ast.Attribute, ast.Subscript)):
        expr = expr.value
    return expr.id if isinstance(expr, ast.Name) else None


def _references(expr: ast.expr, names: set[str]) -> bool:
    return any(isinstance(n, ast.Name) and n.id in names for n in ast.walk(expr))


def _leaks_exception(detail: ast.expr, exc_names: set[str]) -> bool:
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


def _int_const(expr: ast.expr) -> int | None:
    if isinstance(expr, ast.Constant) and type(expr.value) is int:
        return expr.value
    return None


def _mentions_hole(expr: ast.expr) -> bool:
    if isinstance(expr, ast.Name):
        return "hole" in expr.id.lower()
    if isinstance(expr, ast.Attribute):
        return "hole" in expr.attr.lower() or _mentions_hole(expr.value)
    if isinstance(expr, ast.Call):
        func = expr.func
        return (isinstance(func, ast.Name) and func.id == "len") or _mentions_hole(func)
    return False


def _hole_count_findings(tree: ast.AST) -> Iterator[Finding]:
    for node in ast.walk(tree):
        if isinstance(node, ast.Compare):
            operands = [node.left, *node.comparators]
            counts = [_int_const(op) for op in operands]
            if any(c in HOLE_COUNTS for c in counts) and any(
                c is None and _mentions_hole(op) for c, op in zip(counts, operands, strict=True)
            ):
                literal = next(c for c in counts if c in HOLE_COUNTS)
                yield node.lineno, f"comparison against hard-coded hole count {literal}; {CONSTANT_HINT}."

        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            value = _int_const(node.value) if node.value is not None else None
            if value in HOLE_COUNTS and any(
                isinstance(t, ast.Name) and "hole" in t.id.lower() and not t.id.isupper() for t in targets
            ):
                yield node.lineno, f"hole count hard-coded as {value}; {CONSTANT_HINT}."

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
