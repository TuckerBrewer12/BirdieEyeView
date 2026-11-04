from __future__ import annotations

import math
import threading
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

from analytics import eligibility as el
from models.round import Round

SCORE_TYPE_ORDER = [
    "eagle",
    "birdie",
    "par",
    "bogey",
    "double_bogey",
    "triple_bogey",
    "quad_bogey",
]


def _normalize_tee_label(value: Optional[str]) -> str:
    if not value:
        return ""
    normalized = value.lower()
    normalized = normalized.replace("tees", "").replace("tee", "")
    normalized = "".join(ch for ch in normalized if ch.isalnum())
    return normalized


def _resolve_tee_for_yardage(round_obj: Round) -> Optional[Any]:
    """Return a tee-like object that has hole_yardages for yardage analytics."""
    tee = round_obj.get_tee()
    if tee and tee.hole_yardages:
        return tee

    if round_obj.course and round_obj.tee_box:
        requested = _normalize_tee_label(round_obj.tee_box)
        if requested:
            exact = [
                candidate
                for candidate in round_obj.course.tees
                if candidate.color and _normalize_tee_label(candidate.color) == requested and candidate.hole_yardages
            ]
            if len(exact) == 1:
                return exact[0]

            fuzzy = [
                candidate
                for candidate in round_obj.course.tees
                if candidate.color
                and candidate.hole_yardages
                and (
                    requested.startswith(_normalize_tee_label(candidate.color))
                    or _normalize_tee_label(candidate.color).startswith(requested)
                )
            ]
            if len(fuzzy) == 1:
                return fuzzy[0]

    if round_obj.user_tee and round_obj.user_tee.hole_yardages:
        return round_obj.user_tee

    # Without a tee selection, a course with exactly one tee is unambiguous. A selected tee that
    # isn't on the course never borrows another tee's yardages: the yardage is unknown.
    if round_obj.course and not round_obj.tee_box:
        populated = [candidate for candidate in round_obj.course.tees if candidate.hole_yardages]
        if len(populated) == 1:
            return populated[0]

    return None


def _resolve_round_index(rows: List[Dict[str, Any]], round_index: Optional[int]) -> int:
    if not rows:
        raise ValueError("At least one round is required")
    if round_index is None:
        return len(rows) - 1
    if round_index < 0:
        round_index = len(rows) + round_index
    if round_index < 0 or round_index >= len(rows):
        raise IndexError("round_index out of range")
    return round_index


def _average_non_null(values: List[Optional[float]]) -> Optional[float]:
    filtered = [value for value in values if value is not None]
    if not filtered:
        return None
    return sum(filtered) / len(filtered)


def _score_type_from_to_par(to_par: int) -> str:
    if to_par <= -2:
        return "eagle"
    if to_par == -1:
        return "birdie"
    if to_par == 0:
        return "par"
    if to_par == 1:
        return "bogey"
    if to_par == 2:
        return "double_bogey"
    if to_par == 3:
        return "triple_bogey"
    return "quad_bogey"


def _format_date_short(dt: datetime) -> str:
    return f"{dt.year}/{dt.month}/{dt.day}"


def _course_label(round_obj: Round) -> Optional[str]:
    if round_obj.course and round_obj.course.name:
        return round_obj.course.name
    return round_obj.course_name_played


def _milestone_event(round_obj: Optional[Round]) -> Optional[Dict[str, Optional[str]]]:
    """Display event for a round: date, course and round_id (None for a missing or undated round)."""
    if round_obj is None or round_obj.date is None:
        return None
    return {
        "date": _format_date_short(round_obj.date),
        "course": _course_label(round_obj) or "Unknown Course",
        "round_id": str(round_obj.id) if round_obj.id else None,
    }


# ================================================================
# Achievements
#
# Round records, breaks and milestones use complete rounds only, by format: eighteen-hole totals
# from complete 18-hole rounds, nine-hole totals alongside (never doubled). Hole totals and streaks
# use every scored hole. Score names are exact (an albatross is not an eagle). Rounds are taken
# in date order, and the one-year window keeps the time of day and excludes future-dated rounds.
# ================================================================

SCORE_BREAK_THRESHOLDS = [120, 110, 100, 95, 90, 85, 80, 75, 70, 65, 60]
PUTT_BREAK_THRESHOLDS = list(range(45, 20, -3))
GIR_BREAK_THRESHOLDS = list(range(3, 19, 3))


def _hole_rows(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """One row per scored hole, rounds in date order; ``to_par`` is None when par is unknown."""
    rows: List[Dict[str, Any]] = []
    for round_obj in rounds:
        for score in el.scored_holes(round_obj):
            par = el.hole_par(round_obj, score.hole_number)
            rows.append({
                "round": round_obj,
                "strokes": score.strokes,
                "putts": score.putts,
                "gir": score.green_in_regulation is True,
                "to_par": score.strokes - par if par is not None else None,
            })
    return rows


def _count(rows: List[Dict[str, Any]], predicate) -> int:
    return sum(1 for row in rows if predicate(row))


def _to_par_is(value: int):
    return lambda row: row["to_par"] == value


def _first_round(rounds: List[Round], predicate) -> Optional[Round]:
    """Earliest round (input is chronological) satisfying ``predicate``."""
    return next((r for r in rounds if predicate(r)), None)


def _best_round(rounds: List[Round], metric, *, lower: bool) -> tuple[Optional[float], Optional[Round]]:
    """Best metric value and the earliest round reaching it."""
    best_value: Optional[float] = None
    best: Optional[Round] = None
    for round_obj in rounds:
        value = metric(round_obj)
        if value is None:
            continue
        if best_value is None or (value < best_value if lower else value > best_value):
            best_value, best = value, round_obj
    return best_value, best


def _streak(rows: List[Dict[str, Any]], predicate) -> tuple[int, Optional[Dict[str, str]]]:
    best = 0
    best_event: Optional[Dict[str, str]] = None
    current = 0
    for row in rows:
        if not predicate(row):
            current = 0
            continue
        current += 1
        if current > best:
            best = current
            best_event = _milestone_event(row["round"])
    return best, best_event


def _lowest_nine_holes(rounds: List[Round]) -> tuple[Optional[int], Optional[Round]]:
    """Lowest fully scored nine (holes 1-9 or 10-18) inside any round."""
    def best_nine(round_obj: Round) -> Optional[int]:
        by_hole = {score.hole_number: score.strokes for score in el.scored_holes(round_obj)}
        nines = [
            sum(by_hole[n] for n in numbers)
            for numbers in (range(1, 10), range(10, 19))
            if all(n in by_hole for n in numbers)
        ]
        return min(nines) if nines else None

    return _best_round(rounds, best_nine, lower=True)


def _round_gir_percentage(round_obj: Round) -> Optional[float]:
    holes = len(el.scored_holes(round_obj))
    gir = round_obj.get_total_gir()
    return (gir / holes) * 100 if holes and gir is not None else None


_ROW_CACHE = threading.local()


def _round_rows(round_obj: Round) -> List[Dict[str, Any]]:
    """Hole rows for one round, built once per ``notable_achievements`` call (per thread)."""
    cache = getattr(_ROW_CACHE, "rows", None)
    if cache is None:
        return _hole_rows([round_obj])
    rows = cache.get(id(round_obj))
    if rows is None:
        rows = cache[id(round_obj)] = _hole_rows([round_obj])
    return rows


def _round_count(round_obj: Round, predicate) -> int:
    return _count(_round_rows(round_obj), predicate)


def _scoring_records(complete: List[Round], eighteen: List[Round], nine: List[Round], *, lifetime: bool):
    total = Round.calculate_total_score
    birdies = lambda r: _round_count(r, _to_par_is(-1))  # noqa: E731
    eagles = lambda r: _round_count(r, _to_par_is(-2))  # noqa: E731
    lowest, lowest_round = _best_round(eighteen, total, lower=True)
    lowest_nine, lowest_nine_round = _best_round(nine, total, lower=True)
    most_birdies, birdie_round = _best_round(complete, birdies, lower=False)
    most_gir, gir_round = _best_round(complete, Round.get_total_gir, lower=False)
    fewest_putts, putts_round = _best_round(eighteen, Round.get_total_putts, lower=True)
    values = {
        "lowest_round": lowest,
        "lowest_round_nine": lowest_nine,
        "most_birdies_in_round": most_birdies,
        "most_gir_in_round": most_gir,
        "fewest_putts_in_round": fewest_putts,
    }
    events = {
        "lowest_round": _milestone_event(lowest_round),
        "lowest_round_nine": _milestone_event(lowest_nine_round),
        "most_birdies_in_round": _milestone_event(birdie_round),
        "most_gir_in_round": _milestone_event(gir_round),
        "fewest_putts_in_round": _milestone_event(putts_round),
    }
    if lifetime:
        highest, highest_round = _best_round(eighteen, total, lower=False)
        lowest_9, lowest_9_round = _lowest_nine_holes(complete + [r for r in eighteen if r not in complete])
        most_eagles, eagle_round = _best_round(complete, eagles, lower=False)
        values.update(highest_round=highest, lowest_9_holes=lowest_9, most_eagles_in_round=most_eagles)
        events.update(
            highest_round=_milestone_event(highest_round),
            lowest_9_holes=_milestone_event(lowest_9_round),
            most_eagles_in_round=_milestone_event(eagle_round),
        )
    return values, events


def _career_totals(rounds: List[Round], rows: List[Dict[str, Any]], *, lifetime: bool) -> Dict[str, Any]:
    counts = {
        "birdies": _count(rows, _to_par_is(-1)),
        "eagles": _count(rows, _to_par_is(-2)),
        "albatrosses": _count(rows, lambda row: row["to_par"] is not None and row["to_par"] <= -3),
        "hole_in_ones": _count(rows, lambda row: row["strokes"] == 1),
        "pars": _count(rows, _to_par_is(0)),
        "bogeys": _count(rows, _to_par_is(1)),
        "double_bogeys": _count(rows, _to_par_is(2)),
        "triple_bogeys": _count(rows, _to_par_is(3)),
        "quad_bogeys_plus": _count(rows, lambda row: row["to_par"] is not None and row["to_par"] >= 4),
        "gir": _count(rows, lambda row: row["gir"]),
        "three_putts": _count(rows, lambda row: row["putts"] is not None and row["putts"] >= 3),
    }
    if not lifetime:
        return {
            "rounds_played": len(rounds),
            **{key: counts[key] for key in (
                "birdies", "eagles", "albatrosses", "hole_in_ones", "gir",
                "double_bogeys", "triple_bogeys", "quad_bogeys_plus", "three_putts",
            )},
        }
    return {
        "total_rounds_played": len(rounds),
        "total_holes_played": len(rows),
        "total_birdies": counts["birdies"],
        "total_eagles": counts["eagles"],
        "total_albatrosses": counts["albatrosses"],
        "total_hole_in_ones": counts["hole_in_ones"],
        "total_pars": counts["pars"],
        "total_bogeys": counts["bogeys"],
        "total_double_bogeys": counts["double_bogeys"],
        "total_triple_bogeys": counts["triple_bogeys"],
        "total_quad_bogeys_plus": counts["quad_bogeys_plus"],
        "total_gir": counts["gir"],
        "total_3_putts": counts["three_putts"],
    }


def _streaks(rows: List[Dict[str, Any]]):
    found = {
        "longest_birdie_streak": _streak(rows, _to_par_is(-1)),
        "longest_par_streak": _streak(rows, lambda row: row["to_par"] is not None and row["to_par"] <= 0),
        "most_gir_in_a_row": _streak(rows, lambda row: row["gir"]),
        "longest_2_putt_or_less_streak": _streak(rows, lambda row: row["putts"] is not None and row["putts"] <= 2),
    }
    return {key: value for key, (value, _) in found.items()}, {key: event for key, (_, event) in found.items()}


def _home_course(rounds: List[Round], home_course_id: Optional[str]) -> Dict[str, Any]:
    matched = [r for r in rounds if home_course_id and r.course and str(r.course.id) == str(home_course_id)]
    if not matched:
        return {"home_course_name": None, "most_rounds_played": 0, "lowest_score": None, "lowest_score_round": None}
    home = matched[0].course
    layout = home.get_expected_holes()
    holes = el.NINE if layout is not None and len(layout) == 9 else el.EIGHTEEN
    lowest, lowest_round = _best_round(el.complete_rounds(matched, holes), Round.calculate_total_score, lower=True)
    return {
        "home_course_name": home.name or "Home Course",
        "most_rounds_played": len(matched),
        "lowest_score": lowest,
        "lowest_score_round": lowest_round,
    }


def notable_achievements(
    rounds: Iterable[Round],
    *,
    reference_date: Optional[datetime] = None,
    days: int = 365,
    home_course_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Aggregate player achievement stats for lifetime and a one-year window.

    The one-year window is rolling (default last 365 days) relative to ``reference_date`` or the
    current time, compared with the time of day kept; future-dated rounds are outside it.
    """
    now = el.comparable_datetime(reference_date or datetime.now())
    cutoff = now - timedelta(days=days)
    rounds_list = el.chronological(rounds)
    _ROW_CACHE.rows = {}
    try:
        return _notable_achievements(rounds_list, now, cutoff, days, home_course_id)
    finally:
        _ROW_CACHE.rows = None


def _notable_achievements(rounds_list, now, cutoff, days, home_course_id) -> Dict[str, Any]:

    def in_window(round_obj: Optional[Round]) -> bool:
        return (
            round_obj is not None
            and round_obj.date is not None
            and cutoff <= el.comparable_datetime(round_obj.date) <= now
        )

    rounds_year = [r for r in rounds_list if in_window(r)]
    windows = {}
    for name, window_rounds in (("lifetime", rounds_list), ("one_year", rounds_year)):
        complete = el.complete_rounds(window_rounds)
        windows[name] = {
            "rounds": window_rounds,
            "complete": complete,
            "eighteen": el.complete_rounds(window_rounds, el.EIGHTEEN),
            "nine": el.complete_rounds(window_rounds, el.NINE),
            "rows": _hole_rows(window_rounds),
        }
    life, year = windows["lifetime"], windows["one_year"]

    life_records, life_record_events = _scoring_records(life["complete"], life["eighteen"], life["nine"], lifetime=True)
    year_records, year_record_events = _scoring_records(year["complete"], year["eighteen"], year["nine"], lifetime=False)
    life_streaks, life_streak_events = _streaks(life["rows"])
    year_streaks, year_streak_events = _streaks(year["rows"])
    home_life = _home_course(life["rounds"], home_course_id)
    home_year = _home_course(year["rounds"], home_course_id)

    one_putts = lambda r: _round_count(r, lambda row: row["putts"] == 1)  # noqa: E731
    three_putts = lambda r: _round_count(r, lambda row: row["putts"] is not None and row["putts"] >= 3)  # noqa: E731

    def putting(window, *, lifetime: bool):
        fewest, fewest_round = _best_round(window["eighteen"], Round.get_total_putts, lower=True)
        most_one, one_round = _best_round(window["complete"], one_putts, lower=False)
        most_three, three_round = _best_round(window["complete"], three_putts, lower=False)
        values = {"fewest_putts_in_round": fewest, "most_1_putts_in_round": most_one, "most_3_putts_in_round": most_three}
        events = {
            "fewest_putts_in_round": _milestone_event(fewest_round),
            "most_1_putts_in_round": _milestone_event(one_round),
            "most_3_putts_in_round": _milestone_event(three_round),
        }
        return values, events

    putt_values, putt_events = putting(life, lifetime=True)
    year_putt_values, year_putt_events = putting(year, lifetime=False)
    putt_break_rounds = {
        threshold: _first_round(life["eighteen"], lambda r, t=threshold: (r.get_total_putts() or t) < t)
        for threshold in PUTT_BREAK_THRESHOLDS
    }
    putt_values["putt_breaks"] = [
        {"threshold": threshold, "achievement": _milestone_event(r)} for threshold, r in putt_break_rounds.items()
    ]
    year_putt_values["putting_milestones_achieved_from_lifetime_set"] = sum(
        1 for r in putt_break_rounds.values() if in_window(r)
    )

    gir_break_rounds = {
        threshold: _first_round(life["eighteen"], lambda r, t=threshold: (r.get_total_gir() or 0) >= t)
        for threshold in GIR_BREAK_THRESHOLDS
    }
    highest_gir_pct, highest_gir_pct_round = _best_round(life["complete"], _round_gir_percentage, lower=False)
    year_gir_pct, year_gir_pct_round = _best_round(year["complete"], _round_gir_percentage, lower=False)
    year_best_gir, year_best_gir_round = _best_round(year["complete"], Round.get_total_gir, lower=False)

    score_break_rounds = {
        threshold: _first_round(
            life["eighteen"], lambda r, t=threshold: r.calculate_total_score() < t
        )
        for threshold in SCORE_BREAK_THRESHOLDS
    }
    under_par_round = _first_round(life["complete"], lambda r: (r.total_to_par() or 0) < 0)
    first_under_par = None
    if under_par_round is not None and under_par_round.date is not None:
        first_under_par = {"score": under_par_round.calculate_total_score(), **_milestone_event(under_par_round)}
    first_rounds = {
        "first_eagle": _first_round(life["rounds"], lambda r: _round_count(r, _to_par_is(-2)) > 0),
        "first_hole_in_one": _first_round(life["rounds"], lambda r: _round_count(r, lambda row: row["strokes"] == 1) > 0),
    }

    new_records = [f"break_{t}" for t, r in score_break_rounds.items() if in_window(r)]
    if in_window(under_par_round) and first_under_par is not None:
        new_records.append("first_round_under_par")
    new_records += [key for key, r in first_rounds.items() if in_window(r)]

    return {
        "scoring_records": {"lifetime": life_records, "one_year": year_records},
        "scoring_records_events": {"lifetime": life_record_events, "one_year": year_record_events},
        "career_totals": {
            "lifetime": _career_totals(life["rounds"], life["rows"], lifetime=True),
            "one_year": _career_totals(year["rounds"], year["rows"], lifetime=False),
        },
        "best_performance_streaks": {"lifetime": life_streaks, "one_year": year_streaks},
        "best_performance_streaks_events": {"lifetime": life_streak_events, "one_year": year_streak_events},
        "home_course_records": {
            "lifetime": {
                "home_course_name": home_life["home_course_name"],
                "lowest_score_on_home_course": home_life["lowest_score"],
                "most_rounds_played_at_home_course": home_life["most_rounds_played"],
            },
            "one_year": {
                "home_course_name": home_year["home_course_name"] or home_life["home_course_name"],
                "lowest_score_on_home_course": home_year["lowest_score"],
            },
        },
        "home_course_records_events": {
            "lifetime": {"lowest_score_on_home_course": _milestone_event(home_life["lowest_score_round"])},
            "one_year": {"lowest_score_on_home_course": _milestone_event(home_year["lowest_score_round"])},
        },
        "putting_milestones": {"lifetime": putt_values, "one_year": year_putt_values},
        "putting_milestones_events": {"lifetime": putt_events, "one_year": year_putt_events},
        "gir_milestones": {
            "lifetime": {
                "gir_breaks": [
                    {"threshold": t, "achievement": _milestone_event(r)} for t, r in gir_break_rounds.items()
                ],
                "highest_gir_percentage_in_round": highest_gir_pct,
                "most_gir_in_round": life_records["most_gir_in_round"],
            },
            "one_year": {
                "best_gir_round": _milestone_event(year_best_gir_round),
                "best_gir_in_round": year_best_gir,
                "highest_gir_percentage": year_gir_pct,
                "gir_milestones_achieved_from_lifetime_set": sum(1 for r in gir_break_rounds.values() if in_window(r)),
            },
        },
        "gir_milestones_events": {
            "lifetime": {
                "highest_gir_percentage_in_round": _milestone_event(highest_gir_pct_round),
                "most_gir_in_round": life_record_events["most_gir_in_round"],
            },
            "one_year": {
                "best_gir_round": _milestone_event(year_best_gir_round),
                "highest_gir_percentage": _milestone_event(year_gir_pct_round),
            },
        },
        "round_milestones": {
            "lifetime": {
                "score_breaks": [
                    {"threshold": t, "achievement": _milestone_event(r)} for t, r in score_break_rounds.items()
                ],
                "first_round_under_par": first_under_par,
                **{key: _milestone_event(r) for key, r in first_rounds.items()},
            },
            "one_year": {
                "new_personal_records_achieved_count": len(new_records),
                "new_personal_records_achieved": new_records,
            },
        },
        "window_days": days,
    }


def round_summary(round_obj: Round) -> Dict[str, Optional[float]]:
    """Compute summary metrics for a single round."""
    holes_played = len(el.scored_holes(round_obj))
    total_putts = round_obj.get_total_putts()
    total_gir = round_obj.get_total_gir()
    total_strokes = round_obj.calculate_total_score()

    gir_percentage: Optional[float] = None
    putts_per_hole: Optional[float] = None
    if holes_played:
        gir_percentage = (total_gir / holes_played) * 100 if total_gir is not None else None
        putts_per_hole = total_putts / holes_played if total_putts is not None else None

    return {
        "holes_played": float(holes_played),
        "total_strokes": float(total_strokes) if total_strokes is not None else None,
        "total_putts": float(total_putts) if total_putts is not None else None,
        "total_gir": float(total_gir) if total_gir is not None else None,
        "gir_percentage": gir_percentage,
        "putts_per_hole": putts_per_hole,
    }


def metric_comparison_snapshot(
    rows: List[Dict[str, Any]],
    *,
    primary_key: str,
    secondary_key: Optional[str] = None,
    round_index: Optional[int] = None,
    windows: tuple[int, ...] = (5, 10, 20),
    selected_label: str = "Selected Round",
) -> List[Dict[str, Any]]:
    """
    Compare one round against trailing average windows ending at that round.

    The selected round defaults to the most recent row. If a round_index is
    supplied, the trailing averages are computed using rows up to that round.
    """
    target_index = _resolve_round_index(rows, round_index)
    history = rows[: target_index + 1]
    target_row = history[-1]

    result_rows: List[Dict[str, Any]] = [
        {
            "label": selected_label,
            "sample_size": 1,
            "observations": 1 if target_row.get(primary_key) is not None else 0,
            "round_id": target_row.get("round_id"),
            "primary_value": target_row.get(primary_key),
            "secondary_value": target_row.get(secondary_key) if secondary_key else None,
        }
    ]

    for window in windows:
        window_rows = history[-window:]
        primary_avg = _average_non_null([row.get(primary_key) for row in window_rows])
        secondary_avg = (
            _average_non_null([row.get(secondary_key) for row in window_rows])
            if secondary_key
            else None
        )
        result_rows.append(
            {
                "label": f"Last {window} Avg",
                "sample_size": len(window_rows),
                "observations": sum(1 for row in window_rows if row.get(primary_key) is not None),
                "round_id": None,
                "primary_value": primary_avg,
                "secondary_value": secondary_avg,
            }
        )

    return result_rows


def putts_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Return putt totals by round for plotting/reporting."""
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "total_putts": round_obj.get_total_putts(),
                "holes_played": len(el.scored_holes(round_obj)),
            }
        )
    return results


def _comparable_rows(rounds: List[Round], rows: List[Dict[str, Any]], round_index: Optional[int],
                     keys: tuple[str, ...]) -> List[Dict[str, Any]]:
    """Blank ``keys`` on rows that can't be compared with the selected round.

    Round totals only compare between complete rounds of the same format (a nine-hole 45 is not
    averaged with an 18-hole 90). Row positions are kept so ``round_index`` still lines up.
    """
    if not rows:
        return rows
    target = rounds[_resolve_round_index(rows, round_index)]
    holes = el.round_format(target)
    comparable = []
    for round_obj, row in zip(rounds, rows):
        if round_obj.is_complete() and el.round_format(round_obj) == holes:
            comparable.append(row)
        else:
            comparable.append({**row, **{key: None for key in keys}})
    return comparable


def _compare(rounds: Iterable[Round], rows_fn, round_index: Optional[int], primary: str,
             secondary: Optional[str] = None) -> List[Dict[str, Any]]:
    rounds = list(rounds)
    keys = (primary,) + ((secondary,) if secondary else ())
    return metric_comparison_snapshot(
        _comparable_rows(rounds, rows_fn(rounds), round_index, keys),
        primary_key=primary,
        secondary_key=secondary,
        round_index=round_index,
        selected_label="Selected Round",
    )


def score_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    """Selected round score vs trailing averages of complete rounds of the same format."""
    return _compare(rounds, score_trend, round_index, "total_score", "to_par")


def putts_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    """Selected round putts vs trailing averages of complete rounds of the same format."""
    return _compare(rounds, putts_per_round, round_index, "total_putts")


def three_putts_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Return 3-putt count and percentage for each round.

    Counts holes with 3 or more putts among scored holes with known putts. With no putt
    observations the count and percentage are unknown (None), not zero.
    """
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        scores_with_putts = [score for score in el.scored_holes(round_obj) if score.putts is not None]
        holes_with_putt_data = len(scores_with_putts)
        rate = el.Rate(sum(1 for score in scores_with_putts if score.putts >= 3), holes_with_putt_data)
        three_putt_count = rate.successes if holes_with_putt_data else None
        three_putt_percentage = rate.percentage

        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "three_putt_count": three_putt_count,
                "holes_with_putt_data": holes_with_putt_data,
                "three_putt_percentage": three_putt_percentage,
            }
        )
    return results


def three_putts_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    """Selected round 3+ putts vs trailing averages of complete rounds of the same format."""
    return _compare(rounds, three_putts_per_round, round_index, "three_putt_count", "three_putt_percentage")


def _missed_green_holes(round_obj: Round):
    """Scored holes with GIR known to be missed and a known par: (score, par) pairs."""
    for score in el.scored_holes(round_obj):
        if score.green_in_regulation is False:
            par = el.hole_par(round_obj, score.hole_number)
            if par is not None:
                yield score, par


def _scramble_rate(round_obj: Round) -> el.Rate:
    """Scrambling: after missing the green, par or better."""
    holes = list(_missed_green_holes(round_obj))
    return el.Rate(sum(1 for score, par in holes if score.strokes <= par), len(holes))


def _up_and_down_rate(round_obj: Round) -> el.Rate:
    """Up-and-down: after missing the green, at most one putt and par or better."""
    holes = [(score, par) for score, par in _missed_green_holes(round_obj) if score.putts is not None]
    return el.Rate(sum(1 for score, par in holes if score.putts <= 1 and score.strokes <= par), len(holes))


def scrambling_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Scrambling by round:
    - Opportunity: scored hole with GIR missed and a known par (played par or course par)
    - Success: opportunity hole scored at par or better
    """
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        rate = _scramble_rate(round_obj)
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "scramble_opportunities": rate.opportunities,
                "scramble_successes": rate.successes,
                "scramble_failures": rate.opportunities - rate.successes,
                "scrambling_percentage": rate.percentage,
            }
        )
    return results


def up_and_down_trend(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Up & Down by round:
    - Opportunity: scored hole with GIR missed, known putts and a known par
    - Success: at most one putt and par or better (holed out from off the green counts)
    """
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        rate = _up_and_down_rate(round_obj)
        percentage = rate.percentage
        results.append({
            "round_index": index,
            "round_id": round_obj.id,
            "opportunities": rate.opportunities,
            "successes": rate.successes,
            "percentage": round(percentage, 1) if percentage is not None else None,
        })
    return results


def _overall_rate(rates: Iterable[el.Rate]) -> Dict[str, Optional[float]]:
    rates = list(rates)
    total = el.Rate(sum(r.successes for r in rates), sum(r.opportunities for r in rates))
    return {"successes": total.successes, "opportunities": total.opportunities, "percentage": total.percentage}


def overall_scrambling(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    """Scrambling over all opportunities (total successes / total opportunities)."""
    return _overall_rate(_scramble_rate(r) for r in rounds)


def overall_up_and_down(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    """Up-and-down over all opportunities (total successes / total opportunities)."""
    return _overall_rate(_up_and_down_rate(r) for r in rounds)


def scrambling_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    """Selected round scrambling vs trailing averages of complete rounds of the same format."""
    return _compare(rounds, scrambling_per_round, round_index, "scramble_successes", "scrambling_percentage")


def score_trend(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Return total score trend data by round.

    Every round keeps its row (so round_index lines up with the other trends), but only a
    complete round has a total; ``holes`` is its format (9 or 18), never doubled.
    """
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        complete = round_obj.is_complete()
        course_name = (
            round_obj.course.name if round_obj.course else round_obj.course_name_played
        )
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "total_score": round_obj.calculate_total_score() if complete else None,
                "to_par": round_obj.total_to_par() if complete else None,
                "course_name": course_name,
                "holes": el.round_format(round_obj),
            }
        )
    return results


def net_score_trend(
    rounds: Iterable[Round],
    current_handicap_index: Optional[float],
) -> List[Dict[str, Any]]:
    """Return net score trend data by round.

    Net score = gross - Course Handicap, only for a complete round (``Round.calculate_net_score``)
    with a rating covering the holes played. ``to_par`` matches ``score_trend``.
    """
    from analytics.handicap import course_handicap

    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        complete = round_obj.is_complete()
        handicap = course_handicap(current_handicap_index, round_obj) if complete else None
        course_name = (
            round_obj.course.name if round_obj.course else round_obj.course_name_played
        )
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "gross_score": round_obj.calculate_total_score() if complete else None,
                "course_handicap": handicap,
                "net_score": round_obj.calculate_net_score(handicap),
                "course_name": course_name,
                "to_par": round_obj.total_to_par() if complete else None,
            }
        )
    return results


def score_trend_on_this_course(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Score trend for rounds on a single course.

    Rows are ordered by round date (oldest to newest) when date values are available.
    """
    # Shared date ordering: undated last, aware and naive dates compared safely, ties in input order.
    ordered_rounds = list(enumerate(el.chronological(rounds)))

    results: List[Dict[str, Any]] = []
    for index, (_, round_obj) in enumerate(ordered_rounds, start=1):
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "date": round_obj.date,
                "total_score": round_obj.calculate_total_score() if round_obj.is_complete() else None,
                "to_par": round_obj.total_to_par() if round_obj.is_complete() else None,
                "holes": el.round_format(round_obj),
            }
        )
    return results


def gir_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Return GIR totals and percentage by round."""
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        holes_played = len(el.scored_holes(round_obj))
        total_gir = round_obj.get_total_gir()
        gir_percentage: Optional[float] = None
        if holes_played and total_gir is not None:
            gir_percentage = (total_gir / holes_played) * 100

        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "total_gir": total_gir,
                "holes_played": holes_played,
                "gir_percentage": gir_percentage,
            }
        )
    return results


def gir_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    """Selected round GIR vs trailing averages of complete rounds of the same format."""
    return _compare(rounds, gir_per_round, round_index, "total_gir", "gir_percentage")


def putts_per_gir(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Return putts-per-GIR by round.

    Formula:
    - putts_on_gir: sum(putts on holes where GIR is True)
    - putts_per_gir: putts_on_gir / GIR count
    """
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        gir_scores = [score for score in el.scored_holes(round_obj) if score.green_in_regulation is True]
        gir_count = len(gir_scores)
        known = [score.putts for score in gir_scores if score.putts is not None]
        gir_with_putt_data = len(known)
        putts_on_gir = sum(known) if known else None
        metric = (putts_on_gir / gir_with_putt_data) if gir_with_putt_data else None

        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "putts_on_gir": putts_on_gir,
                "gir_count": gir_count,
                "gir_with_putt_data": gir_with_putt_data,
                "putts_per_gir": metric,
            }
        )
    return results


def putts_per_gir_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    """Selected round putts-per-GIR vs trailing averages of complete rounds of the same format."""
    return _compare(rounds, putts_per_gir, round_index, "putts_per_gir", "putts_on_gir")


def overall_putts_per_gir(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    """Aggregate putts per GIR over GIR holes with known putts (same denominator as per round)."""
    total_putts_on_gir = 0
    total_gir = 0
    rounds_with_data = 0

    for round_obj in rounds:
        known = [
            score.putts for score in el.scored_holes(round_obj)
            if score.green_in_regulation is True and score.putts is not None
        ]
        if known:
            rounds_with_data += 1
        total_gir += len(known)
        total_putts_on_gir += sum(known)

    return {
        "rounds_with_data": float(rounds_with_data),
        "total_gir": float(total_gir),
        "total_putts_on_gir": float(total_putts_on_gir),
        "putts_per_gir": (total_putts_on_gir / total_gir) if total_gir else None,
    }


def overall_gir_percentage(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    """Aggregate GIR percentage over scored holes whose GIR was observed.

    Nine- and eighteen-hole rounds combine; holes with unknown GIR are neither hits nor misses.
    """
    total_holes = 0
    total_gir = 0
    rounds_with_data = 0

    for round_obj in rounds:
        observed = [s.green_in_regulation for s in el.scored_holes(round_obj) if s.green_in_regulation is not None]
        if observed:
            rounds_with_data += 1
        total_holes += len(observed)
        total_gir += sum(1 for hit in observed if hit)

    return {
        "rounds_with_data": float(rounds_with_data),
        "holes_played": float(total_holes),
        "total_gir": float(total_gir),
        "total_missed_gir": float(total_holes - total_gir),
        "gir_percentage": (total_gir / total_holes) * 100 if total_holes else None,
    }


def gir_vs_non_gir_score_distribution(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Aggregate score-type percentages for GIR holes vs non-GIR holes.

    Returns two rows:
    - GIR
    - No GIR
    """
    buckets = {
        "GIR": {name: 0 for name in SCORE_TYPE_ORDER},
        "No GIR": {name: 0 for name in SCORE_TYPE_ORDER},
    }
    totals = {"GIR": 0, "No GIR": 0}

    for round_obj in rounds:
        for hole_score in el.scored_holes(round_obj):
            if hole_score.green_in_regulation is None:
                continue

            par = el.hole_par(round_obj, hole_score.hole_number)
            if par is None:
                continue

            bucket = "GIR" if hole_score.green_in_regulation else "No GIR"
            score_type = _score_type_from_to_par(hole_score.strokes - par)
            buckets[bucket][score_type] += 1
            totals[bucket] += 1

    results: List[Dict[str, Any]] = []
    for bucket in ("GIR", "No GIR"):
        row: Dict[str, Any] = {
            "bucket": bucket,
            "holes_counted": totals[bucket],
        }
        for name in SCORE_TYPE_ORDER:
            row[name] = (buckets[bucket][name] / totals[bucket] * 100.0) if totals[bucket] else None
        results.append(row)

    return results


def average_score_when_gir_vs_missed(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Aggregate average hole score for GIR-hit vs missed-GIR holes.

    Returns two rows:
    - GIR
    - No GIR
    """
    buckets: Dict[str, Dict[str, float]] = {
        "GIR": {"strokes_sum": 0.0, "to_par_sum": 0.0, "holes_counted": 0.0},
        "No GIR": {"strokes_sum": 0.0, "to_par_sum": 0.0, "holes_counted": 0.0},
    }

    for round_obj in rounds:
        for hole_score in el.scored_holes(round_obj):
            if hole_score.green_in_regulation is None:
                continue

            par = el.hole_par(round_obj, hole_score.hole_number)
            if par is None:
                continue

            bucket = "GIR" if hole_score.green_in_regulation else "No GIR"
            entry = buckets[bucket]
            entry["strokes_sum"] += hole_score.strokes
            entry["to_par_sum"] += hole_score.strokes - par
            entry["holes_counted"] += 1

    results: List[Dict[str, Any]] = []
    for bucket in ("GIR", "No GIR"):
        holes = int(buckets[bucket]["holes_counted"])
        strokes_sum = buckets[bucket]["strokes_sum"]
        to_par_sum = buckets[bucket]["to_par_sum"]
        results.append(
            {
                "bucket": bucket,
                "holes_counted": holes,
                "average_score": (strokes_sum / holes) if holes else None,
                "average_to_par": (to_par_sum / holes) if holes else None,
            }
        )

    return results


MIN_CONSISTENCY_OBSERVATIONS = 3


def _observed_holes(rounds: Iterable[Round]):
    """Every scored hole with a known par: (round, score, par). Nine- and 18-hole rounds combine."""
    for round_obj in rounds:
        for score in el.scored_holes(round_obj):
            par = el.hole_par(round_obj, score.hole_number)
            if par is not None:
                yield round_obj, score, par


def score_variance_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Aggregate scoring consistency by hole using score standard deviation.

    Higher standard deviation indicates less consistent scoring on that hole. Only holes with
    at least ``MIN_CONSISTENCY_OBSERVATIONS`` scores are ranked; others get ``variance_rank``
    None (one observation has no measurable spread).
    """
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in _observed_holes(rounds):
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {"hole_number": hole_score.hole_number, "par": par, "strokes": []},
        )
        entry["strokes"].append(hole_score.strokes)

    rows: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        strokes: List[int] = entry["strokes"]
        sample_size = len(strokes)
        mean_score = sum(strokes) / sample_size
        variance = sum((score - mean_score) ** 2 for score in strokes) / sample_size
        rows.append(
            {
                "hole_number": hole_number,
                "par": entry["par"],
                "sample_size": sample_size,
                "average_score": mean_score,
                "score_variance": variance,
                "score_std_dev": math.sqrt(variance),
            }
        )

    ranked = [row for row in rows if row["sample_size"] >= MIN_CONSISTENCY_OBSERVATIONS]
    ranked.sort(key=lambda row: (-row["score_std_dev"], row["hole_number"]))
    for rank, row in enumerate(ranked, start=1):
        row["variance_rank"] = rank
    unranked = [row for row in rows if row["sample_size"] < MIN_CONSISTENCY_OBSERVATIONS]
    for row in unranked:
        row["variance_rank"] = None
    return ranked + unranked


def scoring_vs_hole_handicap(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Aggregate average score-to-par by hole handicap.

    Handicap rank is the one played, else the linked course hole's rank.

    Output rows:
    - handicap: 1-18
    - average_to_par: mean(strokes - par)
    - sample_size: number of scored holes used
    """
    by_handicap: Dict[int, List[int]] = {}

    for round_obj, hole_score, par in _observed_holes(rounds):
        handicap = el.hole_handicap(round_obj, hole_score.hole_number)
        if handicap is None:
            continue
        by_handicap.setdefault(handicap, []).append(hole_score.strokes - par)

    results: List[Dict[str, Any]] = []
    for handicap in sorted(by_handicap):
        values = by_handicap[handicap]
        results.append(
            {
                "handicap": handicap,
                "average_to_par": sum(values) / len(values),
                "sample_size": len(values),
            }
        )

    return results


def average_score_relative_to_par_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Aggregate average score and average score-to-par by hole number.

    Intended for rounds played on the same course.
    """
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in _observed_holes(rounds):
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {"hole_number": hole_score.hole_number, "par": par, "strokes": [], "to_par": []},
        )
        entry["strokes"].append(hole_score.strokes)
        entry["to_par"].append(hole_score.strokes - par)

    results: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        strokes: List[int] = entry["strokes"]
        to_par: List[int] = entry["to_par"]
        results.append(
            {
                "hole_number": hole_number,
                "par": entry["par"],
                "average_score": sum(strokes) / len(strokes),
                "average_to_par": sum(to_par) / len(to_par),
                "sample_size": len(strokes),
            }
        )

    return results


def course_difficulty_profile_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Return hole difficulty sorted from hardest to easiest for a single course.

    Hardest is defined as the highest average score-to-par.
    """
    rows = average_score_relative_to_par_by_hole(rounds)
    rows.sort(key=lambda row: (-row["average_to_par"], row["hole_number"]))
    for index, row in enumerate(rows, start=1):
        row["difficulty_rank"] = index
    return rows


def gir_percentage_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Aggregate GIR percentage by hole number over holes whose GIR was observed."""
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in _observed_holes(rounds):
        if hole_score.green_in_regulation is None:
            continue
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {"hole_number": hole_score.hole_number, "par": par, "gir_hits": 0, "sample_size": 0},
        )
        entry["sample_size"] += 1
        if hole_score.green_in_regulation:
            entry["gir_hits"] += 1

    results: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        rate = el.Rate(entry["gir_hits"], entry["sample_size"])
        results.append(
            {
                "hole_number": hole_number,
                "par": entry["par"],
                "gir_hits": rate.successes,
                "sample_size": rate.opportunities,
                "gir_percentage": rate.percentage,
            }
        )

    return results


def average_putts_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Aggregate average putts by hole number over holes with known putts.

    A hole with unknown putts is skipped on its own; other holes in that round still count.
    """
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in _observed_holes(rounds):
        if hole_score.putts is None:
            continue
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {"hole_number": hole_score.hole_number, "par": par, "putts": []},
        )
        entry["putts"].append(hole_score.putts)

    results: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        putts: List[int] = entry["putts"]
        results.append(
            {
                "hole_number": hole_number,
                "par": entry["par"],
                "average_putts": sum(putts) / len(putts),
                "sample_size": len(putts),
            }
        )

    return results


def scoring_by_par(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Aggregate scoring performance by hole par (3, 4, 5).

    Output rows:
    - par: 3, 4, or 5
    - average_to_par: mean(strokes - par)
    - average_strokes: mean(strokes)
    - sample_size: number of holes included
    """
    by_par: Dict[int, List[int]] = {}

    for _, hole_score, par in _observed_holes(rounds):
        if par in (3, 4, 5):
            by_par.setdefault(par, []).append(hole_score.strokes)

    results: List[Dict[str, Any]] = []
    for par in sorted(by_par):
        strokes = by_par[par]
        avg_strokes = sum(strokes) / len(strokes)
        results.append(
            {
                "par": par,
                "average_to_par": avg_strokes - par,
                "average_strokes": avg_strokes,
                "sample_size": len(strokes),
            }
        )
    return results


# Yardage buckets per par: (low, high, order, label), inclusive bounds.
YARDAGE_BUCKETS = {
    3: [
        (0,   149,  0, "< 150"),
        (150, 199,  1, "150–199"),
        (200, 9999, 2, "200+"),
    ],
    4: [
        (0,   349,  0, "< 350"),
        (350, 399,  1, "350–399"),
        (400, 449,  2, "400–449"),
        (450, 9999, 3, "450+"),
    ],
    5: [
        (0,   499,  0, "< 500"),
        (500, 549,  1, "500–549"),
        (550, 9999, 2, "550+"),
    ],
}


def scoring_by_yardage_buckets(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Aggregate avg score-to-par and GIR% by yardage bucket within each par.

    Buckets:
      Par 3: <150, 150-199, 200+
      Par 4: <350, 350-399, 400-449, 450+
      Par 5: <500, 500-549, 550+

    Requires a resolvable tee (course tee or the round's custom tee) with hole_yardages.
    Returns rows sorted by par then bucket_order.
    """
    # key: (par, bucket_order) → {"to_par": [...], "gir": [...], "label": str}
    by_bucket: Dict[tuple, Dict[str, Any]] = {}

    for round_obj in rounds:
        tee = _resolve_tee_for_yardage(round_obj)
        if not tee:
            continue

        for _, hole_score, par in _observed_holes([round_obj]):
            if par not in (3, 4, 5):
                continue

            yardage = tee.hole_yardages.get(hole_score.hole_number)
            if yardage is None:
                continue

            for (lo, hi, order, label) in YARDAGE_BUCKETS[par]:
                if lo <= yardage <= hi:
                    key = (par, order)
                    if key not in by_bucket:
                        by_bucket[key] = {"par": par, "order": order, "label": label, "to_par": [], "yardages": [], "gir": []}
                    by_bucket[key]["to_par"].append(hole_score.strokes - par)
                    by_bucket[key]["yardages"].append(yardage)
                    if hole_score.green_in_regulation is not None:
                        by_bucket[key]["gir"].append(1 if hole_score.green_in_regulation else 0)
                    break

    results: List[Dict[str, Any]] = []
    for key in sorted(by_bucket):
        entry = by_bucket[key]
        to_par_vals = entry["to_par"]
        gir_vals = entry["gir"]
        results.append({
            "par": entry["par"],
            "bucket_label": entry["label"],
            "bucket_order": entry["order"],
            "average_to_par": sum(to_par_vals) / len(to_par_vals),
            "gir_percentage": (sum(gir_vals) / len(gir_vals) * 100.0) if gir_vals else None,
            "sample_size": len(to_par_vals),
            "raw_scores": [{"to_par": tp, "yardage": y} for tp, y in zip(to_par_vals, entry["yardages"])],
        })
    return results


def score_type_distribution_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Percentage of holes by score type for each round.

    Categories (chart groups):
    - eagle (eagle or better)
    - birdie, par, bogey, double_bogey, triple_bogey, quad_bogey (quad bogey or worse)

    A round with no scored holes of known par has unknown (None) percentages.
    """
    results: List[Dict[str, Any]] = []

    for index, round_obj in enumerate(rounds, start=1):
        counts = {name: 0 for name in SCORE_TYPE_ORDER}
        total = 0

        for _, hole_score, par in _observed_holes([round_obj]):
            counts[_score_type_from_to_par(hole_score.strokes - par)] += 1
            total += 1

        row: Dict[str, Any] = {
            "round_index": index,
            "round_id": round_obj.id,
            "holes_counted": total,
        }
        for name in SCORE_TYPE_ORDER:
            row[name] = (counts[name] / total * 100.0) if total else None
        results.append(row)

    return results


def score_type_distribution_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Score-type percentage distribution by hole number for a specific course."""
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in _observed_holes(rounds):
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {
                "hole_number": hole_score.hole_number,
                "par": par,
                "counts": {name: 0 for name in SCORE_TYPE_ORDER},
                "sample_size": 0,
            },
        )
        entry["counts"][_score_type_from_to_par(hole_score.strokes - par)] += 1
        entry["sample_size"] += 1

    results: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        sample_size = entry["sample_size"]
        row: Dict[str, Any] = {
            "hole_number": hole_number,
            "par": entry["par"],
            "sample_size": sample_size,
        }
        for name in SCORE_TYPE_ORDER:
            row[name] = (entry["counts"][name] / sample_size) * 100.0
        results.append(row)

    return results
