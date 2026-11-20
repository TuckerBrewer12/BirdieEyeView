from __future__ import annotations

import sys
from pathlib import Path

import pytest

CI_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts" / "ci"
if str(CI_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(CI_SCRIPTS))

from pr_size import counted_files, verdict

NEW = "2026-11-21T09:00:00Z"
OLD = "2026-11-19T09:00:00Z"


def _files(lines: int):
    return [("api/routers/stats.py", lines)]


def test_counts_added_and_deleted_lines_and_skips_generated_and_binary_files():
    numstat = "\n".join([
        "120\t30\tapi/routers/stats.py",
        "900\t800\tfrontend/src/types/api.gen.ts",
        "4000\t0\tfrontend/openapi.json",
        "-\t-\tfrontend/src/pages/rounds/tests/x.spec.ts-snapshots/rounds-linux.png",
        "2\t1\tdocs/backend/api.md",
    ])

    assert counted_files(numstat) == [("api/routers/stats.py", 150), ("docs/backend/api.md", 3)]


def test_up_to_the_cap_passes():
    ok, message = verdict(_files(500), "", [], NEW)

    assert ok and "500 lines" in message


@pytest.mark.parametrize(
    "body, labels",
    [
        ("## What?\n\n## Why?\n\n- [x] Over 500 lines on purpose", []),
        ("- [X] Over 500 lines on purpose (one migration)", []),
        ("", ["large-pr"]),
    ],
)
def test_a_ticked_box_or_the_label_lets_a_large_pr_through(body, labels):
    assert verdict(_files(501), body, labels, NEW)[0]


def test_an_unticked_box_does_not():
    ok, message = verdict(_files(501), "- [ ] Over 500 lines on purpose", [], NEW)

    assert not ok and "split it" in message and "`large-pr`" in message


def test_prs_opened_before_the_cap_are_not_held_to_it():
    assert verdict(_files(5000), "", [], OLD)[0]
