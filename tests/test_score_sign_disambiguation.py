import pytest
from pathlib import Path

from services.mistral_scorecard_parser import parse_mistral_scorecard_rows

scan_router = pytest.importorskip("api.routers.scan")
_build_round_from_parsed_rows = scan_router._build_round_from_parsed_rows


SAMPLE_2D = """
| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| Handicap | 3 | 9 | 17 | 15 | 1 | 11 | 13 | 5 | 7 |
| G | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 0 | 1 |
|  | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
|  | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Par | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 |
""".strip()


def test_suppressed_putts_still_keep_internal_rows_for_disambiguation() -> None:
    parsed = parse_mistral_scorecard_rows(
        SAMPLE_2D,
        user_context="my name is G. scores written to par. no putts recorded.",
    )

    assert parsed.putts_row == []
    assert parsed.raw_putts_row[:9] == [2, 2, 2, 2, 2, 2, 2, 2, 2]
    assert parsed.raw_shots_to_green_row[:9] == [1, 1, 1, 1, 1, 1, 1, 1, 1]


def test_to_par_plus_one_is_flipped_to_birdie_using_internal_rows() -> None:
    parsed = parse_mistral_scorecard_rows(
        SAMPLE_2D,
        user_context="my name is G. scores written to par. no putts recorded.",
    )

    round_payload, fields = _build_round_from_parsed_rows(
        parsed,
        course_model=None,
        to_par_scoring=None,
    )

    # Hole 1: raw to-par "1" + internal rows (shots=1, putts=2, par=4) => -1 (birdie)
    assert round_payload["hole_scores"][0]["strokes"] == 3
    assert any("score sign corrected" in f for f in fields)


def _load_hmb_markdown() -> str:
    repo_root = Path(__file__).resolve().parents[1]
    raw = (repo_root / "raw_markdown_hmb.txt").read_text(encoding="utf-8")
    start = raw.find("| HOLE |")
    if start == -1:
        return raw.strip()
    end = raw.find("=== END ===", start)
    return raw[start:end if end != -1 else None].strip()


def test_half_moon_bay_score_only_keeps_hidden_rows_and_front9_strokes() -> None:
    markdown = _load_hmb_markdown()
    parsed = parse_mistral_scorecard_rows(
        markdown,
        user_context="my name is G. scores written to par. no putts recorded. name on score row.",
    )
    round_payload, _ = _build_round_from_parsed_rows(
        parsed,
        course_model=None,
        to_par_scoring=None,
    )

    # UI-visible putts are intentionally suppressed in score-only mode.
    assert parsed.putts_row == []
    # But internal evidence rows should still be available for sign disambiguation.
    assert sum(v is not None for v in parsed.raw_putts_row) >= 9
    assert sum(v is not None for v in parsed.raw_shots_to_green_row) >= 9

    # Real Half Moon Bay sample, player G, front 9 expected strokes.
    front9 = [h["strokes"] for h in round_payload["hole_scores"][:9]]
    assert front9 == [5, 3, 3, 5, 4, 3, 3, 5, 4]
