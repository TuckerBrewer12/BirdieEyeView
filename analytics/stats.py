from __future__ import annotations

import math
import threading
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

from analytics import eligibility as el
from analytics.score_types import SCORE_KINDS, SCORE_TYPE_ORDER, score_type_from_to_par
from analytics.verdicts import putts_verdict
from models.hole import HOLES_PER_NINE, HOLES_PER_ROUND
from models.hole_layout import FRONT_NINE, BACK_NINE
from models.round import Round


def _format_date_short(dt: datetime) -> str:
    return f"{dt.year}/{dt.month}/{dt.day}"


def _course_label(round_obj: Round) -> Optional[str]:
    if round_obj.course and round_obj.course.name:
        return round_obj.course.name
    return round_obj.course_name_played


def _milestone_event(round_obj: Optional[Round]) -> Optional[Dict[str, Optional[str]]]:
    if round_obj is None or round_obj.date is None:
        return None
    return {
        "date": _format_date_short(round_obj.date),
        "course": _course_label(round_obj) or "Unknown Course",
        "round_id": str(round_obj.id) if round_obj.id else None,
    }


SCORE_BREAK_THRESHOLDS = [120, 110, 100, 95, 90, 85, 80, 75, 70, 65, 60]
PUTT_BREAK_THRESHOLDS = list(range(45, 20, -3))
GIR_BREAK_THRESHOLDS = list(range(3, 19, 3))


def _hole_rows(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
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
    return next((r for r in rounds if predicate(r)), None)


def _best_round(rounds: List[Round], metric, *, lower: bool) -> tuple[Optional[float], Optional[Round]]:
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
    def best_nine(round_obj: Round) -> Optional[int]:
        by_hole = {score.hole_number: score.strokes for score in el.scored_holes(round_obj)}
        nines = [
            sum(by_hole[n] for n in numbers)
            for numbers in (FRONT_NINE, BACK_NINE)
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
    cache = getattr(_ROW_CACHE, "rows", None)
    if cache is None:
        return _hole_rows([round_obj])
    rows = cache.get(id(round_obj))
    if rows is None:
        rows = cache[id(round_obj)] = _hole_rows([round_obj])
    return rows


def _round_count(round_obj: Round, predicate) -> int:
    return _count(_round_rows(round_obj), predicate)


def _with_pars(rounds: List[Round]) -> List[Round]:
    return [r for r in rounds if r.total_to_par() is not None]


def _with_putts(rounds: List[Round]) -> List[Round]:
    return [r for r in rounds if r.get_total_putts() is not None]


def _scoring_records(complete: List[Round], eighteen: List[Round], nine: List[Round], *, lifetime: bool):
    total = Round.calculate_total_score
    birdies = lambda r: _round_count(r, _to_par_is(-1))
    eagles = lambda r: _round_count(r, _to_par_is(-2))
    lowest, lowest_round = _best_round(eighteen, total, lower=True)
    lowest_nine, lowest_nine_round = _best_round(nine, total, lower=True)
    most_birdies, birdie_round = _best_round(_with_pars(complete), birdies, lower=False)
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
        most_eagles, eagle_round = _best_round(_with_pars(complete), eagles, lower=False)
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
    holes = el.NINE if layout is not None and len(layout) == HOLES_PER_NINE else el.EIGHTEEN
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
    moment = reference_date or datetime.now(timezone.utc)
    if not isinstance(moment, datetime):
        moment = datetime.combine(moment, datetime.min.time())
    now = el.comparable_datetime(moment)
    cutoff = now - timedelta(days=days)
    rounds_list = el.chronological(rounds)
    _ROW_CACHE.rows = {}
    try:
        result = _notable_achievements(rounds_list, now, cutoff, days, home_course_id)
        by_id = {str(r.id): r for r in rounds_list if r.id is not None}
        def mark(value, key=None):
            if isinstance(value, dict):
                if "round_id" in value and "date" in value and key in ("achievement", "first_round_under_par", "first_eagle", "first_hole_in_one"):
                    round_obj = by_id.get(str(value["round_id"])) or next((r for r in rounds_list if r.date and _format_date_short(r.date) == value["date"]), None)
                    value["in_window"] = bool(round_obj and round_obj.date and cutoff <= el.comparable_datetime(round_obj.date) <= now)
                for name, child in list(value.items()):
                    mark(child, name)
            elif isinstance(value, list):
                for child in value:
                    mark(child, key)
        mark(result)
        result["round_milestones"]["lifetime"]["under_par_position"] = under_par_position(SCORE_BREAK_THRESHOLDS, usual_par(rounds_list))
        return result
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

    one_putts = lambda r: _round_count(r, lambda row: row["putts"] == 1)
    three_putts = lambda r: _round_count(r, lambda row: row["putts"] is not None and row["putts"] >= 3)

    def putting(window):
        fewest, fewest_round = _best_round(window["eighteen"], Round.get_total_putts, lower=True)
        putting_rounds = _with_putts(window["complete"])
        most_one, one_round = _best_round(putting_rounds, one_putts, lower=False)
        most_three, three_round = _best_round(putting_rounds, three_putts, lower=False)
        values = {"fewest_putts_in_round": fewest, "most_1_putts_in_round": most_one, "most_3_putts_in_round": most_three}
        events = {
            "fewest_putts_in_round": _milestone_event(fewest_round),
            "most_1_putts_in_round": _milestone_event(one_round),
            "most_3_putts_in_round": _milestone_event(three_round),
        }
        return values, events

    putt_values, putt_events = putting(life)
    year_putt_values, year_putt_events = putting(year)
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


MIN_CONSISTENCY_OBSERVATIONS = 3


def _scored_holes_any_par(rounds: Iterable[Round]):
    for round_obj in rounds:
        for score in el.scored_holes(round_obj):
            yield round_obj, score, el.hole_par(round_obj, score.hole_number)


def score_variance_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in el.observed_holes(rounds):
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


def average_score_relative_to_par_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in el.observed_holes(rounds):
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
    rows = average_score_relative_to_par_by_hole(rounds)
    rows.sort(key=lambda row: (-row["average_to_par"], row["hole_number"]))
    for index, row in enumerate(rows, start=1):
        row["difficulty_rank"] = index
    return rows


def gir_percentage_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in _scored_holes_any_par(rounds):
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
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in _scored_holes_any_par(rounds):
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


def score_type_distribution_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in el.observed_holes(rounds):
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {
                "hole_number": hole_score.hole_number,
                "par": par,
                "counts": {name: 0 for name in SCORE_TYPE_ORDER},
                "sample_size": 0,
            },
        )
        entry["counts"][score_type_from_to_par(hole_score.strokes - par)] += 1
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


def course_hole_stats(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    rounds = list(rounds)
    to_par = {row["hole_number"]: row for row in average_score_relative_to_par_by_hole(rounds)}
    rank = {row["hole_number"]: row["difficulty_rank"] for row in course_difficulty_profile_by_hole(rounds)}
    spread = {row["hole_number"]: row for row in score_variance_by_hole(rounds)}
    greens = {row["hole_number"]: row for row in gir_percentage_by_hole(rounds)}
    putts = {row["hole_number"]: row for row in average_putts_by_hole(rounds)}
    mix = {row["hole_number"]: row for row in score_type_distribution_by_hole(rounds)}
    rows: List[Dict[str, Any]] = []
    for hole_number in sorted(to_par):
        row = to_par[hole_number]
        played = row["sample_size"]
        kinds = mix.get(hole_number)
        average_putts = putts[hole_number]["average_putts"] if hole_number in putts else None
        rows.append(
            {
                "hole_number": hole_number,
                "par": row["par"],
                "sample_size": played,
                "average_score": row["average_score"],
                "average_to_par": row["average_to_par"],
                "difficulty_rank": rank[hole_number],
                "score_std_dev": spread[hole_number]["score_std_dev"] if played >= 2 and hole_number in spread else None,
                "gir_percentage": greens[hole_number]["gir_percentage"] if hole_number in greens else None,
                "average_putts": average_putts,
                "putts_verdict": putts_verdict(average_putts),
                "score_mix": {
                    kind: kinds[name] if kinds else 0.0
                    for kind, name in zip(SCORE_KINDS, SCORE_TYPE_ORDER)
                },
            }
        )
    return rows


def gir_percentage_nines(by_hole: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
    def share(holes: range) -> Optional[float]:
        rows = [row for row in by_hole if row["hole_number"] in holes]
        samples = sum(row["sample_size"] for row in rows)
        return sum(row["gir_hits"] for row in rows) / samples * 100.0 if samples else None

    return {"front_nine": share(FRONT_NINE), "back_nine": share(BACK_NINE), "total": share(range(1, HOLES_PER_ROUND + 1))}


def hole_to_par_nines(by_hole: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
    def total(holes: range) -> Optional[float]:
        averages = [row["average_to_par"] for row in by_hole if row["hole_number"] in holes]
        return sum(averages) if averages else None

    return {"front_nine": total(FRONT_NINE), "back_nine": total(BACK_NINE), "total": total(range(1, HOLES_PER_ROUND + 1))}


def under_par_position(thresholds: List[int], par: int) -> int:
    return sum(1 for threshold in thresholds if threshold >= par)


def usual_par(rounds: Iterable[Round]) -> int:
    pars = [p for p in (r.played_par() for r in rounds if r.holes_played() >= HOLES_PER_ROUND) if p is not None]
    return Counter(pars).most_common(1)[0][0] if pars else 72
