"""`_build_round_from_parsed_rows`: the round a scan sends for review, built from the rows OCR read
off the card and, when the golfer picked one, the course in the database.

These pin the whole payload and the review list (contents and order), not just a field or two, so
the builder can be reorganised without the scan review changing.
"""

from typing import Dict, List, Optional

import pytest

from api.routers import scan
from models import Course, Hole, Tee
from services.mistral_scorecard_parser import ParsedScorecardRows, ParsedTeeRow


def _build(parsed: ParsedScorecardRows, course: Optional[Course] = None, to_par: Optional[bool] = None):
    return scan._build_round_from_parsed_rows(parsed, course_model=course, to_par_scoring=to_par)


def _hole(number: int, strokes=None, putts=None, shots=None, gir=None) -> Dict:
    return {
        "hole_number": number,
        "strokes": strokes,
        "putts": putts,
        "shots_to_green": shots,
        "fairway_hit": None,
        "green_in_regulation": gir,
    }


def _scores(payload: Dict) -> List[Optional[int]]:
    return [hole["strokes"] for hole in payload["hole_scores"]]


def _four_hole_course() -> Course:
    # Holes listed out of order, hole 3 with no stroke index, hole 4 with no par.
    return Course(
        name="Presidio",
        location="San Francisco, CA",
        holes=[
            Hole(number=2, par=3, handicap=17),
            Hole(number=1, par=4, handicap=5),
            Hole(number=3, par=5),
            Hole(number=4, handicap=9),
        ],
        tees=[
            Tee(color="Blue", slope_rating=128, course_rating=71.4, hole_yardages={1: 402, 2: 168}),
            Tee(color="White", hole_yardages={}),
        ],
    )


class TestKnownCourse:
    def test_reads_the_card_against_the_course_it_was_matched_to(self):
        parsed = ParsedScorecardRows(
            course_name="SOMETHING ELSE",  # ignored: the picked course names the card
            par_row=[3, 3, 3, 3],  # ignored too
            score_row=[5, 3, 6, 4, 4, 4],  # longer than the course: cut to its four holes
            putts_row=[2, 2],  # shorter: the rest read as blank
            shots_to_green_row=[3, None, 3, 2],
            gir_row=[None, None, None, None],
            warnings=["Row order guessed"],
        )

        payload, review = _build(parsed, _four_hole_course(), to_par=False)

        assert payload == {
            "course": {
                "name": "Presidio",
                "location": "San Francisco, CA",
                "par": None,  # a four-hole course has no worked-out par
                "holes": [
                    {"number": 1, "par": 4, "handicap": 5},
                    {"number": 2, "par": 3, "handicap": 17},
                    {"number": 3, "par": 5},  # no stroke index: the key is left out
                    {"number": 4, "par": None, "handicap": 9},
                ],
                "tees": [
                    {
                        "color": "Blue",
                        "slope_rating": 128.0,
                        "course_rating": 71.4,
                        "hole_yardages": {"1": 402, "2": 168},
                    },
                    {"color": "White", "slope_rating": None, "course_rating": None, "hole_yardages": {}},
                ],
            },
            "tee_box": None,
            "date": None,
            "hole_scores": [
                _hole(1, strokes=5, putts=2, shots=3, gir=False),
                _hole(2, strokes=3, putts=2, gir=True),  # 3 - 2 = 1 shot to a par 3's green
                _hole(3, strokes=6, shots=3, gir=True),  # 3 shots to a par 5's green
                _hole(4, strokes=4, shots=2),  # no par: no green worked out
            ],
            "notes": None,
        }
        assert review == ["Row order guessed"]

    def test_an_eighteen_hole_course_gives_its_par(self):
        course = Course(name="Full", holes=[Hole(number=n, par=4) for n in range(1, 19)])
        payload, _ = _build(ParsedScorecardRows(score_row=[4] * 18), course)
        assert payload["course"]["par"] == 72
        assert len(payload["hole_scores"]) == 18

    def test_a_course_with_no_holes_reads_eighteen_with_no_par(self):
        payload, review = _build(ParsedScorecardRows(score_row=[4] * 18), Course(name="Bare"))

        assert payload["course"]["holes"] == [{"number": n, "par": None} for n in range(1, 19)]
        assert _scores(payload) == [4] * 18
        assert review == []

    def test_a_to_par_card_needs_the_courses_par(self):
        parsed = ParsedScorecardRows(score_row=[0, 1, -1, 2], putts_row=[2, 2, 1, 2])

        payload, review = _build(parsed, _four_hole_course(), to_par=True)

        assert _scores(payload) == [4, 4, 4, None]
        assert review == ["Hole 4 cannot convert to-par score without known par"]


class TestUnknownCourse:
    def test_reads_the_course_off_the_card(self):
        parsed = ParsedScorecardRows(
            course_name="  HALF   MOON  BAY ",
            par_row=[4, 5, 2, 3, 7, 4, 4, 3, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
            handicap_row=[7, 1, 15],
            tee_rows=[
                ParsedTeeRow(label="Blue", yardages=[410, None, 150] + [300] * 17),
                ParsedTeeRow(label="Red", yardages=[]),
            ],
        )

        payload, _ = _build(parsed)
        course = payload["course"]

        assert course["name"] == "Half Moon Bay"
        assert course["location"] is None
        # Pars outside 3-6 are misreads and dropped; the 16 left are enough for a par.
        assert course["holes"][:6] == [
            {"number": 1, "par": 4, "handicap": 7},
            {"number": 2, "par": 5, "handicap": 1},
            {"number": 3, "par": None, "handicap": 15},
            {"number": 4, "par": 3, "handicap": None},
            {"number": 5, "par": None, "handicap": None},
            {"number": 6, "par": 4, "handicap": None},
        ]
        assert [hole["number"] for hole in course["holes"]] == list(range(1, 19))
        assert course["par"] == 4 + 5 + 3 + 4 + 4 + 3 + 5 + 4 * 9
        # Yardages past the 18th are dropped, blanks are left out, and holes are keyed as text.
        assert course["tees"] == [
            {
                "color": "Blue",
                "slope_rating": None,
                "course_rating": None,
                "hole_yardages": {"1": 410, "3": 150, **{str(n): 300 for n in range(4, 19)}},
            },
            {"color": "Red", "slope_rating": None, "course_rating": None, "hole_yardages": {}},
        ]

    def test_fewer_than_nine_pars_give_no_course_par(self):
        payload, _ = _build(ParsedScorecardRows(par_row=[4] * 8))
        assert payload["course"]["par"] is None
        payload, _ = _build(ParsedScorecardRows(par_row=[4] * 9))
        assert payload["course"]["par"] == 36

    def test_a_blank_card(self):
        payload, review = _build(ParsedScorecardRows())

        assert payload["course"] == {
            "name": None,
            "location": None,
            "par": None,
            "holes": [{"number": n, "par": None, "handicap": None} for n in range(1, 19)],
            "tees": [],
        }
        assert payload["hole_scores"] == [_hole(n) for n in range(1, 19)]
        assert review == [f"Hole {n} strokes missing" for n in range(1, 19)]


class TestStrokes:
    def test_out_of_range_scores_are_dropped_without_a_note(self):
        parsed = ParsedScorecardRows(par_row=[4] * 18, score_row=[0, 1, 15, 16] + [4] * 14)
        payload, review = _build(parsed, to_par=False)
        assert _scores(payload)[:4] == [None, 1, 15, None]
        assert review == []

    def test_to_par_scores_are_added_to_par(self):
        parsed = ParsedScorecardRows(par_row=[4] * 18, score_row=[-1, 0, 2, -4, 12] + [0] * 13)
        payload, review = _build(parsed, to_par=True)
        # -4 on a par 4 is 0 and 12 over is 16: both out of range, dropped without a note.
        assert _scores(payload)[:5] == [3, 4, 6, None, None]
        assert review == []

    @pytest.mark.parametrize(
        ("to_par", "hint", "expected"),
        [
            (None, True, 5),  # no answer from the golfer: the card's own hint decides
            (None, None, 1),
            (None, False, 1),
            (True, None, 5),
            (False, True, 1),  # the golfer's answer beats the hint
        ],
    )
    def test_who_decides_the_card_is_to_par(self, to_par, hint, expected):
        parsed = ParsedScorecardRows(par_row=[4] * 18, score_row=[1] + [0] * 17, score_to_par_hint=hint)
        payload, _ = _build(parsed, to_par=to_par)
        assert payload["hole_scores"][0]["strokes"] == expected

    def test_missing_holes_are_noted_in_order_after_the_parsers_notes(self):
        parsed = ParsedScorecardRows(
            par_row=[4] * 18,
            score_row=[4, None, 4, None] + [4] * 14,
            warnings=["first", "second"],
        )
        _, review = _build(parsed, to_par=False)
        assert review == ["first", "second", "Hole 2 strokes missing", "Hole 4 strokes missing"]


class TestScoreSign:
    """On a to-par card OCR can read a "-1" as "1". Shots to the green plus putts tell which."""

    @staticmethod
    def _first_hole(shots, putts, raw_shots=None, raw_putts=None, par=4, to_par=True):
        parsed = ParsedScorecardRows(
            par_row=[par] + [4] * 17,
            score_row=[1] + [0] * 17,
            shots_to_green_row=[shots],
            putts_row=[putts],
            raw_shots_to_green_row=[raw_shots],
            raw_putts_row=[raw_putts],
        )
        payload, review = _build(parsed, to_par=to_par)
        return payload["hole_scores"][0]["strokes"], review

    def test_a_birdie_read_as_a_bogey_is_corrected_and_noted(self):
        strokes, review = self._first_hole(shots=2, putts=1)
        assert strokes == 3
        assert review == ["Hole 1 score sign corrected (birdie vs bogey disambiguated)"]

    def test_a_real_bogey_stands(self):
        assert self._first_hole(shots=2, putts=3) == (5, [])

    def test_evidence_that_fits_neither_leaves_the_reading(self):
        assert self._first_hole(shots=2, putts=2) == (5, [])  # level par
        assert self._first_hole(shots=4, putts=3) == (5, [])  # +3

    def test_the_hidden_rows_win_over_the_shown_ones(self):
        # The golfer said they don't track putts, so the shown row is empty, but the raw one remains.
        assert self._first_hole(shots=None, putts=None, raw_shots=2, raw_putts=1)[0] == 3
        assert self._first_hole(shots=2, putts=3, raw_shots=2, raw_putts=1)[0] == 3
        # A blank hidden cell falls back to the shown one.
        assert self._first_hole(shots=2, putts=1, raw_shots=None, raw_putts=None)[0] == 3

    def test_implausible_evidence_is_ignored(self):
        assert self._first_hole(shots=11, putts=0)[0] == 5
        assert self._first_hole(shots=0, putts=2)[0] == 5
        assert self._first_hole(shots=2, putts=7)[0] == 5
        assert self._first_hole(shots=None, putts=1)[0] == 5

    def test_only_on_a_to_par_card(self):
        assert self._first_hole(shots=2, putts=1, to_par=False) == (1, [])


class TestPutts:
    def test_out_of_range_and_impossible_putts_are_dropped_and_noted(self):
        parsed = ParsedScorecardRows(
            par_row=[4] * 18,
            score_row=[4, 4, 4, 3, None] + [4] * 13,
            putts_row=[11, -1, 4, 4, 2, 0],
        )
        payload, review = _build(parsed, to_par=False)

        assert [hole["putts"] for hole in payload["hole_scores"][:6]] == [None, None, 4, None, 2, 0]
        assert review == [
            "Hole 1 putts out of range",
            "Hole 2 putts out of range",
            "Hole 4 putts exceed strokes",
            "Hole 5 strokes missing",
        ]


class TestGreens:
    def test_a_green_the_card_marks_stands(self):
        parsed = ParsedScorecardRows(
            par_row=[4] * 18, score_row=[4] * 18, putts_row=[2] * 18, shots_to_green_row=[4] * 18,
            gir_row=[True, False],
        )
        payload, _ = _build(parsed, to_par=False)
        assert [hole["green_in_regulation"] for hole in payload["hole_scores"][:3]] == [True, False, False]

    def test_worked_out_from_shots_to_the_green(self):
        parsed = ParsedScorecardRows(
            par_row=[3, 3, 4, 4, 5, 5, 4] + [4] * 11,
            score_row=[4] * 18,
            putts_row=[0] * 18,  # would say every green was missed if it were used
            shots_to_green_row=[1, 2, 2, 3, 3, 4, 11],
        )
        payload, _ = _build(parsed, to_par=False)
        holes = payload["hole_scores"]
        assert [hole["green_in_regulation"] for hole in holes[:7]] == [True, False, True, False, True, False, False]
        # An out-of-range shots cell still decided the green before it was dropped.
        assert holes[6]["shots_to_green"] is None

    def test_worked_out_from_strokes_less_putts(self):
        parsed = ParsedScorecardRows(
            par_row=[4, 4, 4, 4, 4, 3, 5],
            score_row=[4, 5, 4, None, 4, 4, 5],
            putts_row=[2, 2, None, 2, 11, 2, 3],
        )
        payload, _ = _build(parsed, to_par=False)
        greens = [hole["green_in_regulation"] for hole in payload["hole_scores"][:7]]
        # Dropped putts (hole 5) and missing strokes or putts leave it unknown.
        assert greens == [True, False, None, None, None, False, True]

    def test_no_par_no_green(self):
        parsed = ParsedScorecardRows(score_row=[4, 4], putts_row=[2, 2], shots_to_green_row=[2, None], gir_row=[None, True])
        payload, _ = _build(parsed, to_par=False)
        assert [hole["green_in_regulation"] for hole in payload["hole_scores"][:2]] == [None, True]
