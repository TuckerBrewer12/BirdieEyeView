import ast
import importlib
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
PACKAGES = ["analytics", "api", "services"]
SOURCES = [
    path
    for path in ROOT.rglob("*.py")
    if not any(part in {".venv", "venv", "node_modules", ".git"} for part in path.parts)
]


def _exports(package: str) -> list[str]:
    return list(getattr(importlib.import_module(package), "__all__", []))


def _imported_through(package: str, name: str) -> bool:
    for path in SOURCES:
        if path.is_relative_to(ROOT / package):
            continue
        text = path.read_text(encoding="utf-8")
        if re.search(rf"\b{package}\.{name}\b", text):
            return True
        for node in ast.walk(ast.parse(text)):
            if isinstance(node, ast.ImportFrom) and node.module == package:
                if any(alias.name == name for alias in node.names):
                    return True
    return False


@pytest.mark.parametrize("package", PACKAGES)
def test_every_re_export_has_a_caller(package):
    unused = [name for name in _exports(package) if not _imported_through(package, name)]
    assert unused == [], f"{package}.__all__ names nothing imports: {unused}"
