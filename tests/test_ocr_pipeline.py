from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
load_dotenv()

import pytest

from services.gemini_table_merger import merge_split_tables
from services.mistral_ocr_service import MistralOCRService
from services.mistral_scorecard_parser import parse_mistral_scorecard_rows

_RUN_LIVE_OCR = os.environ.get("RUN_LIVE_OCR_TESTS", "").strip().lower() in {"1", "true", "yes", "on"}
if not _RUN_LIVE_OCR:
    pytestmark = pytest.mark.skip(
        reason="Live OCR integration tests are disabled. Set RUN_LIVE_OCR_TESTS=1 to enable."
    )
elif not os.environ.get("MISTRAL_API_KEY"):
    pytestmark = pytest.mark.skip(
        reason="MISTRAL_API_KEY is required for live OCR integration tests."
    )

@dataclass
class ScorecardFixture:
    image: str

    player_name: str

    expected_scores: List[Optional[int]]

    expected_putts: List[Optional[int]] = field(default_factory=list)

    user_context: Optional[str] = None

    def build_user_context(self) -> str:
        if self.user_context:
            return self.user_context
        return f"my name is {self.player_name}."


FIXTURES: List[ScorecardFixture] = [
    ScorecardFixture(
        image="half_moon_bay_round.png",
        player_name="G",
        expected_scores=[
            1, -1, 0, 0, 0, -1, 0, 0, 1,
            1, 1, 1, 0, -1, 1, 2, 0, 0,
        ],
        user_context="my name is G. scores written to par. name on score row.",
    ),
    ScorecardFixture(
        image="half_moon_bay_round.png",
        player_name="T",
        expected_scores=[
            1, 1, 0, 1, 1, 1, 1, 1, 8,
            0, 1, 2, 0, 1, 0, 0, 0, 1,
        ],
        user_context="my name is T. scores written to par. name on score row. row order: score, shots to green, putts",
    ),
    ScorecardFixture(
        image="blue_rock_round.png",
        player_name="Tucker",
        expected_scores=[
            4, 4, 4, 5, 6, 4, 7, 3, 4,
            4, 4, 4, 5, 6, 6, 5, 7, None
        ],
        user_context="my name is Tucker. scores written as raw strokes.",
    ),
    ScorecardFixture(
        image="eaglevins_90.jpg",
        player_name="Tucker",
        expected_scores=[1, 1, 0, 0, 0, 1, 2, 0, 1, 1, 1, 1, 2, 2, None, 2, 1, 1],
        user_context="my name is Tucker. scores written to par.",
    ),
]

SCORECARD_DIR = Path(__file__).parent / "test_scorecards"

def _get_markdown(image_name: str) -> str:
    async def _run():
        svc = MistralOCRService()
        ocr_resp = await svc.ocr_file(SCORECARD_DIR / image_name)
        raw = MistralOCRService.extract_markdown_text(ocr_resp)
        return await merge_split_tables(raw)
    return asyncio.run(_run())


def _compare(
    fixture: ScorecardFixture,
    actual_scores: List[Optional[int]],
    actual_putts: List[Optional[int]],
) -> List[str]:
    errors: List[str] = []

    for i, expected in enumerate(fixture.expected_scores):
        if expected is None:
            continue
        actual = actual_scores[i] if i < len(actual_scores) else None
        if actual != expected:
            errors.append(
                f"Hole {i + 1} score: expected {expected}, got {actual}"
            )

    for i, expected in enumerate(fixture.expected_putts):
        if expected is None:
            continue
        actual = actual_putts[i] if i < len(actual_putts) else None
        if actual != expected:
            errors.append(
                f"Hole {i + 1} putts: expected {expected}, got {actual}"
            )

    return errors


@pytest.mark.parametrize("fixture", FIXTURES, ids=lambda f: f"{f.image}:{f.player_name}")
def test_ocr_pipeline(fixture: ScorecardFixture) -> None:
    image_path = SCORECARD_DIR / fixture.image
    assert image_path.exists(), f"Test image not found: {image_path}"

    markdown = _get_markdown(fixture.image)
    assert markdown, f"Mistral OCR returned empty markdown for {fixture.image}"

    print(f"\n=== MERGED MARKDOWN ({fixture.image}) ===\n{markdown}\n=== END ===")
    parsed = parse_mistral_scorecard_rows(markdown, user_context=fixture.build_user_context())

    scores = list(parsed.score_row) + [None] * 18
    putts = list(parsed.putts_row) + [None] * 18

    print(f"\n{'─' * 60}")
    print(f"Image : {fixture.image}  Player: {fixture.player_name}")
    print(f"Scores: {scores[:18]}")
    print(f"Putts : {putts[:18]}")
    print(f"Mode  : {parsed.extraction_mode}  to_par={parsed.score_to_par_hint}")
    if parsed.warnings:
        print(f"Warns : {parsed.warnings[:5]}")

    mismatches = _compare(fixture, scores[:18], putts[:18])
    assert not mismatches, "\n" + "\n".join(mismatches)
