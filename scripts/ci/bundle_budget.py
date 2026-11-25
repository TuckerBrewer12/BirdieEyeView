import gzip
import json
import re
import sys
from pathlib import Path

ENTRY_GZIP_BUDGET_KB = 250
DEV_ONLY_SOURCES = ("/src/testing/", "/previews/", "/brand/BrandHarness")

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def entry_chunk() -> Path:
    html = (DIST / "index.html").read_text()
    match = re.search(r'<script type="module"[^>]*src="/(assets/[^"]+\.js)"', html)
    if not match:
        sys.exit("No module script in frontend/dist/index.html; run `npm run build -- --sourcemap` first.")
    return DIST / match.group(1)


def dev_only_modules(chunk: Path) -> list[str]:
    source_map = chunk.with_name(chunk.name + ".map")
    if not source_map.exists():
        sys.exit(f"No {source_map.name}; build with `npm run build -- --sourcemap`.")
    sources = json.loads(source_map.read_text())["sources"]
    return sorted(s for s in sources if any(marker in s for marker in DEV_ONLY_SOURCES))


def main() -> int:
    chunk = entry_chunk()
    raw = chunk.read_bytes()
    gzip_kb = len(gzip.compress(raw, 9)) / 1000
    leaked = dev_only_modules(chunk)
    print(f"{chunk.name}: {len(raw) / 1000:.1f} kB, {gzip_kb:.1f} kB gzip (budget {ENTRY_GZIP_BUDGET_KB} kB)")
    failed = False
    if gzip_kb > ENTRY_GZIP_BUDGET_KB:
        print(
            f"::error title=Bundle budget::The entry chunk is {gzip_kb:.1f} kB gzip, over the "
            f"{ENTRY_GZIP_BUDGET_KB} kB budget. Load the new code on demand, or raise "
            "ENTRY_GZIP_BUDGET_KB in scripts/ci/bundle_budget.py and say why in the PR."
        )
        failed = True
    if leaked:
        print(
            "::error title=Bundle budget::Dev-only modules are in the entry chunk: "
            + ", ".join(leaked[:5])
            + (f" and {len(leaked) - 5} more" if len(leaked) > 5 else "")
        )
        failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
