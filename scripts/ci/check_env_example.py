#!/usr/bin/env python3
from __future__ import annotations

import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCAN_DIRS = ["api", "services", "database", "analytics", "models"]

EXEMPT = {
    "PORT",
    "PATH",
    "HOME",
    "PYTHONPATH",
    "CI",
    "GITHUB_ACTIONS",
    "LOAD_DOTENV",
    # Injected by Railway at runtime.
    "RAILWAY_ENVIRONMENT_ID",
    "golfcourse_api_key",
}

ENV_HELPERS = {
    "_env_int", "_env_bool", "_env_float", "_env_str", "_env_list",
    "env_int", "env_bool", "env_float", "env_str", "env_list",
}


def env_keys_in_code() -> dict[str, str]:
    found: dict[str, str] = {}

    for directory in SCAN_DIRS:
        for path in sorted((ROOT / directory).rglob("*.py")):
            try:
                tree = ast.parse(path.read_text(), filename=str(path))
            except SyntaxError:
                continue

            for node in ast.walk(tree):
                name = _env_key_from_node(node)
                if name and name not in found:
                    rel = path.relative_to(ROOT)
                    found[name] = f"{rel}:{node.lineno}"

    return found


def _env_key_from_node(node: ast.AST) -> str | None:
    if isinstance(node, ast.Subscript):
        target = node.value
        if (
            isinstance(target, ast.Attribute)
            and target.attr == "environ"
            and isinstance(node.slice, ast.Constant)
            and isinstance(node.slice.value, str)
        ):
            return node.slice.value
        return None

    if isinstance(node, ast.Call) and node.args:
        func = node.func
        is_getenv = isinstance(func, ast.Attribute) and func.attr == "getenv"
        is_environ_get = (
            isinstance(func, ast.Attribute)
            and func.attr == "get"
            and isinstance(func.value, ast.Attribute)
            and func.value.attr == "environ"
        )
        is_env_helper = isinstance(func, ast.Name) and func.id in ENV_HELPERS
        if (is_getenv or is_environ_get or is_env_helper) and isinstance(
            node.args[0], ast.Constant
        ):
            value = node.args[0].value
            if isinstance(value, str):
                return value

    return None


def keys_in_example() -> set[str]:
    keys: set[str] = set()
    for raw in (ROOT / ".env.example").read_text().splitlines():
        line = raw.strip().lstrip("#").strip()
        if "=" not in line:
            continue
        key = line.split("=", 1)[0].strip()
        if key and key.replace("_", "").isalnum() and " " not in key:
            keys.add(key)
    return keys


def main() -> int:
    in_code = env_keys_in_code()
    documented = keys_in_example()

    missing = {k: v for k, v in in_code.items() if k not in documented and k not in EXEMPT}

    for key, where in sorted(missing.items()):
        print(
            f"::error file=.env.example::{key} is read at {where} but is not "
            f"listed in .env.example. Add it with a safe default."
        )

    if missing:
        print(f"\n{len(missing)} undocumented env var(s).", file=sys.stderr)
        return 1

    stale = sorted(documented - set(in_code) - EXEMPT)
    if stale:
        print(f"note: in .env.example but not read in Python: {', '.join(stale)}")

    print(f"OK: all {len(in_code)} env vars read in code are documented.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
