"""Write the API's OpenAPI schema to frontend/openapi.json, where the frontend's types are generated from.

Run from the repo root: python scripts/dump_openapi.py
CI runs it with --check and fails if the committed schema is stale.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.main import app  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "frontend" / "openapi.json"


def main() -> int:
    schema = json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n"
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text() != schema:
            print("frontend/openapi.json is stale: run `python scripts/dump_openapi.py`.")
            return 1
        return 0
    OUT.write_text(schema)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
