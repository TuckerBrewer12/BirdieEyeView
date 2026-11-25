import sys
from pathlib import Path

from vulture import Vulture

ROOT = Path(__file__).resolve().parents[2]
PRODUCTION = ("api", "services", "database", "analytics", "models")
CALLERS = (*PRODUCTION, "scripts", "data", "tests")
KINDS = {"function", "method", "class", "property"}
MIN_CONFIDENCE = 60

FRAMEWORK_DECORATORS = [
    "@router.*",
    "@app.*",
    "@*validator",
    "@field_serializer",
    "@model_serializer",
    "@computed_field",
    "@property",
    "@*.exception_handler",
    "@*.middleware",
    "@*.on_event",
    "@pytest.fixture",
    "@*.fixture",
]
FRAMEWORK_HOOKS = ["model_post_init", "handle_starttag", "handle_endtag", "handle_data", "test_*"]


def unused_production_code() -> list:
    vulture = Vulture(ignore_names=FRAMEWORK_HOOKS, ignore_decorators=FRAMEWORK_DECORATORS)
    vulture.scavenge([str(ROOT / path) for path in CALLERS if (ROOT / path).exists()])
    return [
        item
        for item in vulture.get_unused_code(min_confidence=MIN_CONFIDENCE)
        if item.typ in KINDS and Path(item.filename).resolve().relative_to(ROOT).parts[0] in PRODUCTION
    ]


def main() -> int:
    unused = unused_production_code()
    for item in unused:
        path = Path(item.filename).resolve().relative_to(ROOT)
        print(f"::error file={path},line={item.first_lineno},title=Dead code::{item.message}")
    if unused:
        print(f"{len(unused)} unused in production code. Delete it, or call it from where it belongs.")
        return 1
    print("No unused functions, methods or classes in production code.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
