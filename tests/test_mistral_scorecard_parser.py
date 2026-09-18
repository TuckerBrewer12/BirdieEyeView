from services.mistral_scorecard_parser import (
    ParsedScorecardRows,
    _merge_parsed_halves,
    parse_mistral_scorecard_rows,
)


SAMPLE = """
HOLE 1 2 3 4 5 6 7 8 9 OUT 10 11 12 13 14 15 16 17 18 IN TOT
MEN'S HCP 10 8 18 2 12 4 16 6 14 1 13 9 5 17 15 11 3 7
Tucker 1 1 0 0 0 3 2 0 1 8 1 1 -1 2 2 1 2 1 1 10 18
R 1 2 1 1 0 3 0 2 1 11 2 3 2 1 1 1 0 2 1 13 24
PAR 5 3 4 4 3 5 4 4 5 37 4 5 4 4 3 4 3 4 4 35 72
""".strip()

SAMPLE_SHORT_NAME_AMBIGUOUS = """
HOLE 1 2 3 4 5 6 7 8 9
HANDICAP 9 1 7 3 5 2 8 4 6
TOT 9 9 9 9 9 9 9 9 9
T 1 1 1 1 1 1 1 1 1
""".strip()

SAMPLE_PIPE_G_ONLY = """
| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| Handicap | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| G | 1 | 0 | 1 | 0 | 1 | 0 | 1 | 0 | 1 |
|  | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
|  | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
""".strip()

EAGLE_VINES_WITH_INITIALS = """
| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | OUT | INITIALS | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | IN | TOT |
| Tucker | 1 | 1 | 0 | 0 | 0 | 1 | 2 | 0 | 1 | 43 |  | 1 | 1 | 1 | 2 | 2 | 1 | 2 | 1 | 1 | 47 | 90 |
| PAR | 5 | 3 | 4 | 4 | 3 | 5 | 4 | 4 | 5 | 37 |  | 4 | 5 | 4 | 4 | 3 | 4 | 3 | 4 | 4 | 35 | 72 |
""".strip()

BLUE_ROCK_SPLIT = """
| Men's Handicap | 9 | 17 | 7 | 3 | 1 | 11 | 13 | 15 | 5 |  |
| RICK | 5 | 3 | 5 | 6 | 5 | 4 | 7 | 4 | 6 | 44 |
| TUCKER | 4 | 4 | 4 | 5 | 6 | 4 | 7 | 3 | 4 | 41 |
| KEN | 6 | 4 | 5 | 5 | 5 | 4 | 7 | 3 | 7 | 46 |
| VIC | 4 | 3 | 5 | 5 | 6 | 5 | 4 | 3 | 5 | 38 |
| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | OUT |

| INITIALES | 346 | 167 | 355 | 380 | 551 | 413 | 196 | 167 | 412 | 378 |
|  | 12 | 16 | 4 | 10 | 18 | 2 | 14 | 6 | 8 |  |
|  | 5 | 3 | 5 | 5 | 7 | 5 | 5 | 5 | 5 | 45 |
|  | 4 | 4 | 4 | 4 | 5 | 6 | 6 | 5 | 7 | 45 |
|  | 6 | 3 | 5 | 5 | 6 | 6 | 4 | 6 | 7 | 46 |
|  | 5 | 3 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 40 |
|  | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | IN |
""".strip()

INCOMPLETE_FULL_ROW = """
| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | OUT | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | IN | TOT |
| Tucker | 4 | 4 | 4 | 5 | 6 | 4 | 7 | 3 | 4 | 41 |
""".strip()

MISALIGNED_SPLIT = """
| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | OUT |
| Tucker | 4 | 4 | 4 | 5 | 6 | 4 | 7 | 3 | 4 | 41 |
| HOLE | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | IN |
|  | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 |  |
""".strip()


def test_single_row_hint_keeps_score_row_and_skips_putts_row() -> None:
    parsed = parse_mistral_scorecard_rows(
        SAMPLE,
        user_context="scan tucker row only, final scores which are scored to par",
    )

    assert parsed.score_to_par_hint is True
    assert parsed.putts_row == []
    assert parsed.score_row[:9] == [1, 1, 0, 0, 0, 3, 2, 0, 1]
    assert parsed.score_row[9:18] == [1, 1, -1, 2, 2, 1, 2, 1, 1]


def test_extracts_par_row_with_out_in_tot_columns() -> None:
    parsed = parse_mistral_scorecard_rows(SAMPLE, user_context="scan tucker row only")
    assert parsed.par_row[:9] == [5, 3, 4, 4, 3, 5, 4, 4, 5]
    assert parsed.par_row[9:18] == [4, 5, 4, 4, 3, 4, 3, 4, 4]


def test_no_putting_or_gir_hint_suppresses_extra_rows() -> None:
    parsed = parse_mistral_scorecard_rows(
        SAMPLE,
        user_context="scan tucker final scores to par, no putting or GIR",
    )
    assert parsed.score_to_par_hint is True
    assert parsed.score_row[:9] == [1, 1, 0, 0, 0, 3, 2, 0, 1]
    assert parsed.putts_row == []
    assert parsed.gir_row == []


def test_single_letter_name_does_not_match_tot_substring_row() -> None:
    parsed = parse_mistral_scorecard_rows(
        SAMPLE_SHORT_NAME_AMBIGUOUS,
        user_context="my name is T. scores written as raw strokes.",
    )

    assert parsed.score_row[:9] == [1, 1, 1, 1, 1, 1, 1, 1, 1]


def test_missing_named_player_row_does_not_fall_back_to_other_player() -> None:
    parsed = parse_mistral_scorecard_rows(
        SAMPLE_PIPE_G_ONLY,
        user_context="my name is T. scores written to par. name on score row.",
    )

    assert parsed.score_row == []
    assert "Could not detect player score row" in parsed.warnings


def test_explicit_initials_column_preserves_back_nine_alignment() -> None:
    parsed = parse_mistral_scorecard_rows(
        EAGLE_VINES_WITH_INITIALS,
        user_context="my name is Tucker. no putts recorded. scores written to par",
    )

    assert parsed.score_row == [1, 1, 0, 0, 0, 1, 2, 0, 1, 1, 1, 1, 2, 2, 1, 2, 1, 1]
    assert parsed.par_row == [5, 3, 4, 4, 3, 5, 4, 4, 5, 4, 5, 4, 4, 3, 4, 3, 4, 4]


def test_split_tables_pair_unlabeled_back_row_by_player_ordinal() -> None:
    parsed = parse_mistral_scorecard_rows(
        BLUE_ROCK_SPLIT,
        user_context="my name is Tucker. no putts recorded",
    )

    assert parsed.extraction_mode == "2d_column_split"
    assert parsed.score_row == [4, 4, 4, 5, 6, 4, 7, 3, 4, 4, 4, 4, 4, 5, 6, 6, 5, 7]


def test_incomplete_named_full_row_is_rejected() -> None:
    parsed = parse_mistral_scorecard_rows(
        INCOMPLETE_FULL_ROW,
        user_context="my name is Tucker. no putts recorded",
    )

    assert parsed.score_row == []
    assert "Named player row is incomplete" in parsed.warnings


def test_misaligned_split_does_not_treat_hole_numbers_as_scores() -> None:
    parsed = parse_mistral_scorecard_rows(
        MISALIGNED_SPLIT,
        user_context="my name is Tucker. no putts recorded",
    )

    assert parsed.score_row == []
    assert "Player score row is incomplete across split tables" in parsed.warnings


def test_layout_hints_map_rows_from_each_supported_name_position() -> None:
    row_values = {
        "score": [4] * 9,
        "putts": [2] * 9,
        "shots": [2] * 9,
    }
    cases = [
        (["score", "putts", "shots"], "score"),
        (["shots", "score", "putts"], "shots"),
        (["putts", "shots", "score"], "putts"),
    ]

    for row_order, name_row in cases:
        lines = ["| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |"]
        for row_type in row_order:
            label = "Tucker" if row_type == name_row else ""
            values = " | ".join(str(value) for value in row_values[row_type])
            lines.append(f"| {label} | {values} |")
        context_order = ", ".join(
            "shots to green" if row_type == "shots" else row_type
            for row_type in row_order
        )
        context_name = "shots to green" if name_row == "shots" else name_row

        parsed = parse_mistral_scorecard_rows(
            "\n".join(lines),
            user_context=(
                f"my name is Tucker. name on {context_name} row. "
                f"row order: {context_order}"
            ),
        )

        assert parsed.score_row[:9] == row_values["score"]
        assert parsed.putts_row[:9] == row_values["putts"]
        assert parsed.shots_to_green_row[:9] == row_values["shots"]
        assert parsed.sign_evidence_trusted is True


def test_merge_parsed_halves_preserves_hidden_sign_evidence() -> None:
    front = ParsedScorecardRows(
        score_row=[1] * 9 + [None] * 9,
        raw_putts_row=[2] * 9 + [None] * 9,
        raw_shots_to_green_row=[1] * 9 + [None] * 9,
        sign_evidence_trusted=True,
    )
    back = ParsedScorecardRows(
        score_row=[None] * 9 + [1] * 9,
        raw_putts_row=[None] * 9 + [2] * 9,
        raw_shots_to_green_row=[None] * 9 + [1] * 9,
        sign_evidence_trusted=True,
    )

    merged = _merge_parsed_halves(front, back)

    assert merged.raw_putts_row == [2] * 18
    assert merged.raw_shots_to_green_row == [1] * 18
    assert merged.sign_evidence_trusted is True
