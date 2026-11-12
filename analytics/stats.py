from __future__ import annotations

import math
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, get_args

from analytics.handicap import round_course_handicap, round_net_score
from models.hole import BACK_NINE, FRONT_NINE, HOLES_PER_NINE, HOLES_PER_ROUND
from models.hole_score import ScoreKind, score_kind
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
SCORE_KINDS: List[ScoreKind] = list(get_args(ScoreKind))


def _valid_hole_scores(round_obj: Round):
    return [score for score in round_obj.hole_scores if score.hole_number is not None]


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

    if round_obj.course:
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


def round_half_up(value: float, digits: int = 1) -> float:
    """Rounds a half up, as the app has always shown its figures. Python's round() takes a half to
    the even digit, so 82.25 would read 82.2 here and 82.3 everywhere else."""
    scale = 10 ** digits
    return math.floor(value * scale + 0.5) / scale


def rolling_average(values: List[Optional[float]], window: int = 5) -> List[Optional[float]]:
    """Each value's average with the `window - 1` before it, to a tenth. Nulls are skipped; a
    window with no values has no average."""
    averages: List[Optional[float]] = []
    for i in range(len(values)):
        recent = [v for v in values[max(0, i - window + 1):i + 1] if v is not None]
        averages.append(round_half_up(sum(recent) / len(recent)) if recent else None)
    return averages


def score_mix_from_to_par(to_pars: List[int]) -> Dict[str, float]:
    """Each score kind's share of the holes, as a percentage to a hundredth. Every kind is present.

    A hundredth, not a tenth: the page shows whole percents, and 7.46 rounded to a tenth first would read 8%."""
    counts = {kind: 0 for kind in SCORE_KINDS}
    for kind in filter(None, map(score_kind, to_pars)):
        counts[kind] += 1
    return {kind: round_half_up(count / len(to_pars) * 100, 2) if to_pars else 0.0 for kind, count in counts.items()}


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


def parse_date_short(text: str) -> date:
    """The day `_format_date_short` wrote, e.g. 2026/5/28."""
    year, month, day = (int(part) for part in text.split("/"))
    return date(year, month, day)


def _oldest_first(round_set: Iterable[Round]) -> List[Round]:
    """Rounds by date, undated ones last."""
    return sorted(round_set, key=lambda r: (r.date is None, r.date))


def _course_label(round_obj: Round) -> Optional[str]:
    if round_obj.course and round_obj.course.name:
        return round_obj.course.name
    return round_obj.course_name_played


def _milestone_event(round_obj: Round) -> Optional[Dict[str, str]]:
    if round_obj.date is None:
        return None
    return {
        "date": _format_date_short(round_obj.date),
        "course": _course_label(round_obj) or "Unknown Course",
        "round_id": str(round_obj.id) if round_obj.id else None,
    }


def _mark_in_window(event: Optional[Dict[str, Any]], cutoff: date) -> bool:
    """Marks a milestone's first round as inside the window or not, and returns which."""
    if not event:
        return False
    event["in_window"] = parse_date_short(event["date"]) >= cutoff
    return event["in_window"]


def _count_score_type(rows: List[Dict[str, Any]], score_type: str) -> int:
    return sum(1 for row in rows if row["score_type"] == score_type)


def _count_three_putts(rows: List[Dict[str, Any]]) -> int:
    return sum(1 for row in rows if row["putts"] is not None and row["putts"] >= 3)


def _best_round_metric(
    round_set: List[Round], fn
) -> Optional[int]:
    vals = [fn(round_obj) for round_obj in round_set]
    vals = [value for value in vals if value is not None]
    return max(vals) if vals else None


def _achievement_hole_rows(round_set: List[Round]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for round_obj in round_set:
        for hole_score in sorted(_valid_hole_scores(round_obj), key=lambda hs: hs.hole_number or 0):
            if hole_score.hole_number is None:
                continue
            par = round_obj.get_hole_par(hole_score.hole_number)
            score_type = (
                _score_type_from_to_par(hole_score.strokes - par)
                if (hole_score.strokes is not None and par is not None)
                else None
            )
            rows.append(
                {
                    "round_id": round_obj.id,
                    "date": round_obj.date,
                    "course": (
                        round_obj.course.name
                        if round_obj.course and round_obj.course.name
                        else (round_obj.course_name_played or "Unknown Course")
                    ),
                    "strokes": hole_score.strokes,
                    "putts": hole_score.putts,
                    "gir": hole_score.green_in_regulation is True,
                    "score_type": score_type,
                    "is_hio": hole_score.strokes == 1 if hole_score.strokes is not None else False,
                }
            )
    return rows


def _first_event_in_rounds(round_set: List[Round], predicate) -> Optional[Dict[str, str]]:
    for round_obj in _oldest_first(round_set):
        for row in _achievement_hole_rows([round_obj]):
            if predicate(row):
                return _milestone_event(round_obj)
    return None


def _round_total_par(round_obj: Round) -> Optional[int]:
    if round_obj.course and round_obj.course.par is not None:
        return round_obj.course.par
    pars: List[int] = []
    for hole_score in _valid_hole_scores(round_obj):
        if hole_score.hole_number is None:
            continue
        par = round_obj.get_hole_par(hole_score.hole_number)
        if par is not None:
            pars.append(par)
    if not pars:
        return None
    return sum(pars)


def usual_par(rounds: Iterable[Round]) -> int:
    """The par the golfer most often plays a full round against; 72 until they have one."""
    pars = [p for p in (r.played_par() for r in rounds if r.holes_played() >= 18) if p is not None]
    return Counter(pars).most_common(1)[0][0] if pars else 72


def under_par_position(thresholds: List[int], par: int) -> int:
    """How many score breaks a round under `par` comes after: breaking a score above par is the
    easier mark, and breaking par itself is the same mark, so it reads first."""
    return sum(1 for threshold in thresholds if threshold >= par)


def _first_round_under_par_event(round_set: List[Round]) -> Optional[Dict[str, Any]]:
    for round_obj in _oldest_first(round_set):
        total = round_obj.calculate_total_score()
        round_par = _round_total_par(round_obj)
        if total is None or round_par is None:
            continue
        if total < round_par:
            event = _milestone_event(round_obj)
            if event is None:
                continue
            return {
                "score": total,
                "date": event["date"],
                "course": event["course"],
                "round_id": event["round_id"],
            }
    return None


def _first_round_below(round_set: List[Round], threshold: int, *, inclusive: bool = False) -> Optional[Dict[str, str]]:
    for round_obj in _oldest_first(round_set):
        total = round_obj.calculate_total_score()
        if total is None:
            continue
        if (inclusive and total <= threshold) or (not inclusive and total < threshold):
            return _milestone_event(round_obj)
    return None


def _streak_with_event(rows: List[Dict[str, Any]], predicate) -> tuple[int, Optional[Dict[str, str]]]:
    best = 0
    best_event: Optional[Dict[str, str]] = None
    current = 0
    for row in rows:
        if predicate(row):
            current += 1
            if current > best:
                best = current
                if row["date"] is not None:
                    best_event = {
                        "date": _format_date_short(row["date"]),
                        "course": row["course"],
                        "round_id": str(row["round_id"]) if row["round_id"] else None,
                    }
        else:
            current = 0
    return best, best_event


def _lowest_9_with_event(round_set: List[Round]) -> tuple[Optional[int], Optional[Dict[str, str]]]:
    best: Optional[int] = None
    best_event: Optional[Dict[str, str]] = None
    for round_obj in round_set:
        by_hole = {score.hole_number: score for score in _valid_hole_scores(round_obj) if score.hole_number is not None}
        front_vals = [by_hole.get(i).strokes for i in FRONT_NINE if by_hole.get(i) and by_hole.get(i).strokes is not None]
        back_vals = [by_hole.get(i).strokes for i in BACK_NINE if by_hole.get(i) and by_hole.get(i).strokes is not None]
        if len(front_vals) == HOLES_PER_NINE:
            score = sum(front_vals)
            if best is None or score < best:
                best = score
                best_event = _milestone_event(round_obj)
        if len(back_vals) == HOLES_PER_NINE:
            score = sum(back_vals)
            if best is None or score < best:
                best = score
                best_event = _milestone_event(round_obj)
    return best, best_event


def _best_round_event(round_set: List[Round], metric_fn, *, prefer_lower: bool = False) -> Optional[Dict[str, str]]:
    best_metric: Optional[float] = None
    best_round: Optional[Round] = None
    for round_obj in _oldest_first(round_set):
        metric = metric_fn(round_obj)
        if metric is None:
            continue
        if best_metric is None:
            best_metric = float(metric)
            best_round = round_obj
            continue
        if prefer_lower and metric < best_metric:
            best_metric = float(metric)
            best_round = round_obj
        if not prefer_lower and metric > best_metric:
            best_metric = float(metric)
            best_round = round_obj
    if best_round is None:
        return None
    return _milestone_event(best_round)


def _home_course_metrics_for_rounds(round_set: List[Round], home_course_id: Optional[str]) -> Dict[str, Any]:
    if not home_course_id:
        return {"home_course_name": None, "most_rounds_played": 0, "lowest_score": None, "lowest_score_event": None}

    matched = [
        round_obj
        for round_obj in round_set
        if round_obj.course and str(round_obj.course.id) == str(home_course_id)
    ]
    if not matched:
        return {"home_course_name": None, "most_rounds_played": 0, "lowest_score": None, "lowest_score_event": None}

    label = matched[0].course.name if matched[0].course and matched[0].course.name else "Home Course"
    best_score: Optional[int] = None
    best_round: Optional[Round] = None
    for round_obj in _oldest_first(full_rounds(matched)):
        total_score = round_obj.calculate_total_score()
        if total_score is None:
            continue
        if best_score is None or total_score < best_score:
            best_score = total_score
            best_round = round_obj
    return {
        "home_course_name": label,
        "most_rounds_played": len(matched),
        "lowest_score": best_score,
        "lowest_score_event": _milestone_event(best_round) if best_round else None,
    }


def _first_round_with_putts_below(round_set: List[Round], threshold: int) -> Optional[Dict[str, str]]:
    for round_obj in _oldest_first(round_set):
        total_putts = round_obj.get_total_putts()
        if total_putts is not None and total_putts < threshold:
            return _milestone_event(round_obj)
    return None


def _round_gir_percentage(round_obj: Round) -> Optional[float]:
    holes = len(_valid_hole_scores(round_obj))
    gir = round_obj.get_total_gir()
    if not holes or gir is None:
        return None
    return (gir / holes) * 100


def _first_round_reaching_gir(round_set: List[Round], threshold: int) -> Optional[Dict[str, str]]:
    for round_obj in _oldest_first(round_set):
        total_gir = round_obj.get_total_gir()
        if total_gir is not None and total_gir >= threshold:
            return _milestone_event(round_obj)
    return None


def notable_achievements(
    rounds: Iterable[Round],
    *,
    reference_date: Optional[date] = None,
    days: int = 365,
    home_course_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Aggregate player achievement stats for lifetime and a one-year window.

    One-year window is rolling (default last 365 days, counted in calendar days) up to
    `reference_date`, or today's UTC date when omitted.
    """
    today = reference_date or datetime.now(timezone.utc).date()
    cutoff = today - timedelta(days=days)
    rounds_list = list(rounds)

    rounds_year = [r for r in rounds_list if r.date is not None and cutoff <= r.date.date() <= today]
    # A record or milestone set by a round's total (lowest, highest, fewest putts, most greens,
    # breaking a score) counts only full rounds: a nine's 40 is not a round of 40.
    full_list = full_rounds(rounds_list)
    full_year = full_rounds(rounds_year)

    lifetime_holes = _achievement_hole_rows(rounds_list)
    year_holes = _achievement_hole_rows(rounds_year)

    lifetime_round_scores = [s for s in (r.calculate_total_score() for r in full_list) if s is not None]
    year_round_scores = [s for s in (r.calculate_total_score() for r in full_year) if s is not None]

    lowest_9_lifetime, lowest_9_lifetime_event = _lowest_9_with_event(rounds_list)

    scoring_records = {
        "lifetime": {
            "lowest_round": min(lifetime_round_scores) if lifetime_round_scores else None,
            "highest_round": max(lifetime_round_scores) if lifetime_round_scores else None,
            "lowest_9_holes": lowest_9_lifetime,
            "most_birdies_in_round": _best_round_metric(rounds_list, lambda r: _count_score_type(_achievement_hole_rows([r]), "birdie")),
            "most_eagles_in_round": _best_round_metric(rounds_list, lambda r: _count_score_type(_achievement_hole_rows([r]), "eagle")),
            "most_gir_in_round": _best_round_metric(full_list, lambda r: r.get_total_gir()),
            "fewest_putts_in_round": min([value for value in (r.get_total_putts() for r in full_list) if value is not None], default=None),
        },
        "one_year": {
            "lowest_round": min(year_round_scores) if year_round_scores else None,
            "most_birdies_in_round": _best_round_metric(rounds_year, lambda r: _count_score_type(_achievement_hole_rows([r]), "birdie")),
            "most_gir_in_round": _best_round_metric(full_year, lambda r: r.get_total_gir()),
            "fewest_putts_in_round": min([value for value in (r.get_total_putts() for r in full_year) if value is not None], default=None),
        },
    }
    scoring_records_events = {
        "lifetime": {
            "lowest_round": _best_round_event(full_list, lambda r: r.calculate_total_score(), prefer_lower=True),
            "highest_round": _best_round_event(full_list, lambda r: r.calculate_total_score()),
            "lowest_9_holes": lowest_9_lifetime_event,
            "most_birdies_in_round": _best_round_event(rounds_list, lambda r: _count_score_type(_achievement_hole_rows([r]), "birdie")),
            "most_eagles_in_round": _best_round_event(rounds_list, lambda r: _count_score_type(_achievement_hole_rows([r]), "eagle")),
            "most_gir_in_round": _best_round_event(full_list, lambda r: r.get_total_gir()),
            "fewest_putts_in_round": _best_round_event(full_list, lambda r: r.get_total_putts(), prefer_lower=True),
        },
        "one_year": {
            "lowest_round": _best_round_event(full_year, lambda r: r.calculate_total_score(), prefer_lower=True),
            "most_birdies_in_round": _best_round_event(rounds_year, lambda r: _count_score_type(_achievement_hole_rows([r]), "birdie")),
            "most_gir_in_round": _best_round_event(full_year, lambda r: r.get_total_gir()),
            "fewest_putts_in_round": _best_round_event(full_year, lambda r: r.get_total_putts(), prefer_lower=True),
        },
    }

    career_totals = {
        "lifetime": {
            "total_rounds_played": len(rounds_list),
            "total_holes_played": len(lifetime_holes),
            "total_birdies": _count_score_type(lifetime_holes, "birdie"),
            "total_eagles": _count_score_type(lifetime_holes, "eagle"),
            "total_hole_in_ones": sum(1 for row in lifetime_holes if row["is_hio"]),
            "total_pars": _count_score_type(lifetime_holes, "par"),
            "total_bogeys": _count_score_type(lifetime_holes, "bogey"),
            "total_double_bogeys": _count_score_type(lifetime_holes, "double_bogey"),
            "total_triple_bogeys": _count_score_type(lifetime_holes, "triple_bogey"),
            "total_quad_bogeys_plus": _count_score_type(lifetime_holes, "quad_bogey"),
            "total_gir": sum(1 for row in lifetime_holes if row["gir"]),
            "total_3_putts": _count_three_putts(lifetime_holes),
        },
        "one_year": {
            "rounds_played": len(rounds_year),
            "birdies": _count_score_type(year_holes, "birdie"),
            "eagles": _count_score_type(year_holes, "eagle"),
            "hole_in_ones": sum(1 for row in year_holes if row["is_hio"]),
            "gir": sum(1 for row in year_holes if row["gir"]),
            "double_bogeys": _count_score_type(year_holes, "double_bogey"),
            "triple_bogeys": _count_score_type(year_holes, "triple_bogey"),
            "quad_bogeys_plus": _count_score_type(year_holes, "quad_bogey"),
            "three_putts": _count_three_putts(year_holes),
        },
    }

    lifetime_birdie_streak, lifetime_birdie_event = _streak_with_event(lifetime_holes, lambda row: row["score_type"] == "birdie")
    lifetime_par_streak, lifetime_par_event = _streak_with_event(
        lifetime_holes,
        lambda row: row["score_type"] in {"par", "birdie", "eagle"},
    )
    lifetime_gir_streak, lifetime_gir_event = _streak_with_event(lifetime_holes, lambda row: row["gir"])
    lifetime_two_putt_streak, lifetime_two_putt_event = _streak_with_event(
        lifetime_holes, lambda row: row["putts"] is not None and row["putts"] <= 2
    )
    one_year_birdie_streak, one_year_birdie_event = _streak_with_event(year_holes, lambda row: row["score_type"] == "birdie")
    one_year_par_streak, one_year_par_event = _streak_with_event(
        year_holes,
        lambda row: row["score_type"] in {"par", "birdie", "eagle"},
    )
    one_year_gir_streak, one_year_gir_event = _streak_with_event(year_holes, lambda row: row["gir"])
    one_year_two_putt_streak, one_year_two_putt_event = _streak_with_event(
        year_holes, lambda row: row["putts"] is not None and row["putts"] <= 2
    )

    streaks = {
        "lifetime": {
            "longest_birdie_streak": lifetime_birdie_streak,
            "longest_par_streak": lifetime_par_streak,
            "most_gir_in_a_row": lifetime_gir_streak,
            "longest_2_putt_or_less_streak": lifetime_two_putt_streak,
        },
        "one_year": {
            "longest_birdie_streak": one_year_birdie_streak,
            "longest_par_streak": one_year_par_streak,
            "most_gir_in_a_row": one_year_gir_streak,
            "longest_2_putt_or_less_streak": one_year_two_putt_streak,
        },
    }
    best_performance_streaks_events = {
        "lifetime": {
            "longest_birdie_streak": lifetime_birdie_event,
            "longest_par_streak": lifetime_par_event,
            "most_gir_in_a_row": lifetime_gir_event,
            "longest_2_putt_or_less_streak": lifetime_two_putt_event,
        },
        "one_year": {
            "longest_birdie_streak": one_year_birdie_event,
            "longest_par_streak": one_year_par_event,
            "most_gir_in_a_row": one_year_gir_event,
            "longest_2_putt_or_less_streak": one_year_two_putt_event,
        },
    }

    home_lifetime = _home_course_metrics_for_rounds(rounds_list, home_course_id)
    home_year = _home_course_metrics_for_rounds(rounds_year, home_course_id)
    home_course_records = {
        "lifetime": {
            "home_course_name": home_lifetime["home_course_name"],
            "lowest_score_on_home_course": home_lifetime["lowest_score"],
            "most_rounds_played_at_home_course": home_lifetime["most_rounds_played"],
        },
        "one_year": {
            "home_course_name": home_year["home_course_name"] or home_lifetime["home_course_name"],
            "lowest_score_on_home_course": home_year["lowest_score"],
        },
    }
    home_course_records_events = {
        "lifetime": {
            "lowest_score_on_home_course": home_lifetime["lowest_score_event"],
        },
        "one_year": {
            "lowest_score_on_home_course": home_year["lowest_score_event"],
        },
    }

    putting_milestones = {
        "lifetime": {
            "fewest_putts_in_round": min([value for value in (r.get_total_putts() for r in full_list) if value is not None], default=None),
            "most_1_putts_in_round": _best_round_metric(rounds_list, lambda r: sum(1 for row in _achievement_hole_rows([r]) if row["putts"] == 1)),
            "most_3_putts_in_round": _best_round_metric(rounds_list, lambda r: sum(1 for row in _achievement_hole_rows([r]) if row["putts"] is not None and row["putts"] >= 3)),
        },
        "one_year": {
            "fewest_putts_in_round": min([value for value in (r.get_total_putts() for r in full_year) if value is not None], default=None),
            "most_1_putts_in_round": _best_round_metric(rounds_year, lambda r: sum(1 for row in _achievement_hole_rows([r]) if row["putts"] == 1)),
            "most_3_putts_in_round": _best_round_metric(rounds_year, lambda r: sum(1 for row in _achievement_hole_rows([r]) if row["putts"] is not None and row["putts"] >= 3)),
        },
    }
    putting_milestones_events = {
        "lifetime": {
            "fewest_putts_in_round": _best_round_event(full_list, lambda r: r.get_total_putts(), prefer_lower=True),
            "most_1_putts_in_round": _best_round_event(rounds_list, lambda r: sum(1 for row in _achievement_hole_rows([r]) if row["putts"] == 1)),
            "most_3_putts_in_round": _best_round_event(
                rounds_list, lambda r: sum(1 for row in _achievement_hole_rows([r]) if row["putts"] is not None and row["putts"] >= 3)
            ),
        },
        "one_year": {
            "fewest_putts_in_round": _best_round_event(full_year, lambda r: r.get_total_putts(), prefer_lower=True),
            "most_1_putts_in_round": _best_round_event(rounds_year, lambda r: sum(1 for row in _achievement_hole_rows([r]) if row["putts"] == 1)),
            "most_3_putts_in_round": _best_round_event(
                rounds_year, lambda r: sum(1 for row in _achievement_hole_rows([r]) if row["putts"] is not None and row["putts"] >= 3)
            ),
        },
    }

    putting_thresholds = list(range(45, 20, -3))
    putting_breaks: List[Dict[str, Any]] = []
    for threshold in putting_thresholds:
        putting_breaks.append(
            {
                "threshold": threshold,
                "achievement": _first_round_with_putts_below(full_list, threshold),
            }
        )

    putting_milestones_in_window = sum(_mark_in_window(row["achievement"], cutoff) for row in putting_breaks)

    putting_milestones["lifetime"]["putt_breaks"] = putting_breaks
    putting_milestones["one_year"]["putting_milestones_achieved_from_lifetime_set"] = putting_milestones_in_window

    gir_thresholds = list(range(3, 19, 3))
    gir_breaks: List[Dict[str, Any]] = []
    for threshold in gir_thresholds:
        gir_breaks.append(
            {
                "threshold": threshold,
                "achievement": _first_round_reaching_gir(full_list, threshold),
            }
        )

    lifetime_gir_counts = [r.get_total_gir() for r in full_list if r.get_total_gir() is not None]
    lifetime_gir_pct = [_round_gir_percentage(r) for r in full_list]
    lifetime_gir_pct = [value for value in lifetime_gir_pct if value is not None]

    one_year_gir_candidates = []
    for round_obj in full_year:
        gir = round_obj.get_total_gir()
        gir_pct = _round_gir_percentage(round_obj)
        if gir is not None and gir_pct is not None and round_obj.date is not None:
            one_year_gir_candidates.append((round_obj, gir, gir_pct))

    best_gir_round_event: Optional[Dict[str, str]] = None
    if one_year_gir_candidates:
        best_round, _, _ = sorted(
            one_year_gir_candidates,
            key=lambda item: (-item[1], item[0].date),
        )[0]
        best_gir_round_event = _milestone_event(best_round)

    highest_gir_pct_one_year = max((item[2] for item in one_year_gir_candidates), default=None)
    best_gir_count_one_year = max((item[1] for item in one_year_gir_candidates), default=None)

    gir_milestones_in_window = sum(_mark_in_window(row["achievement"], cutoff) for row in gir_breaks)

    gir_milestones = {
        "lifetime": {
            "gir_breaks": gir_breaks,
            "highest_gir_percentage_in_round": max(lifetime_gir_pct) if lifetime_gir_pct else None,
            "most_gir_in_round": max(lifetime_gir_counts) if lifetime_gir_counts else None,
        },
        "one_year": {
            "best_gir_round": best_gir_round_event,
            "best_gir_in_round": best_gir_count_one_year,
            "highest_gir_percentage": highest_gir_pct_one_year,
            "gir_milestones_achieved_from_lifetime_set": gir_milestones_in_window,
        },
    }
    gir_milestones_events = {
        "lifetime": {
            "highest_gir_percentage_in_round": _best_round_event(full_list, _round_gir_percentage),
            "most_gir_in_round": _best_round_event(full_list, lambda r: r.get_total_gir()),
        },
        "one_year": {
            "best_gir_round": best_gir_round_event,
            "highest_gir_percentage": _best_round_event(full_year, _round_gir_percentage),
        },
    }

    break_thresholds = [120, 110, 100, 95, 90, 85, 80, 75, 70, 65, 60]
    score_breaks: List[Dict[str, Any]] = []
    for threshold in break_thresholds:
        score_breaks.append(
            {
                "threshold": threshold,
                "achievement": _first_round_below(full_list, threshold),
            }
        )

    first_round_under_par = _first_round_under_par_event(full_list)
    round_milestones_lifetime = {
        "score_breaks": score_breaks,
        "under_par_position": under_par_position(break_thresholds, usual_par(rounds_list)),
        "first_round_under_par": first_round_under_par,
        "first_eagle": _first_event_in_rounds(rounds_list, lambda row: row["score_type"] == "eagle"),
        "first_hole_in_one": _first_event_in_rounds(rounds_list, lambda row: row["is_hio"]),
    }
    # A score milestone first reached in the window is a new personal record.
    new_records = sum(_mark_in_window(row["achievement"], cutoff) for row in score_breaks) + sum(
        _mark_in_window(round_milestones_lifetime[key], cutoff)
        for key in ("first_round_under_par", "first_eagle", "first_hole_in_one")
    )

    return {
        "scoring_records": scoring_records,
        "scoring_records_events": scoring_records_events,
        "career_totals": career_totals,
        "best_performance_streaks": streaks,
        "best_performance_streaks_events": best_performance_streaks_events,
        "home_course_records": home_course_records,
        "home_course_records_events": home_course_records_events,
        "putting_milestones": putting_milestones,
        "putting_milestones_events": putting_milestones_events,
        "gir_milestones": gir_milestones,
        "gir_milestones_events": gir_milestones_events,
        "round_milestones": {
            "lifetime": round_milestones_lifetime,
            "one_year": {
                "new_personal_records_achieved_count": new_records,
            },
        },
        "window_days": days,
    }


def round_summary(round_obj: Round) -> Dict[str, Optional[float]]:
    """Compute summary metrics for a single round."""
    hole_scores = _valid_hole_scores(round_obj)
    holes_played = len(hole_scores)
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
                "holes_played": len(_valid_hole_scores(round_obj)),
            }
        )
    return results


def score_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    """Selected round score vs trailing averages."""
    return metric_comparison_snapshot(
        score_trend(list(rounds)),
        primary_key="total_score",
        secondary_key="to_par",
        round_index=round_index,
        selected_label="Selected Round",
    )


def putts_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    """Selected round putts vs trailing averages."""
    return metric_comparison_snapshot(
        putts_per_round(list(rounds)),
        primary_key="total_putts",
        round_index=round_index,
        selected_label="Selected Round",
    )


def three_putts_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Return 3-putt count and percentage for each round.

    3-putt percentage is based on holes with a non-null putts value.
    """
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        scores_with_putts = [
            score for score in _valid_hole_scores(round_obj) if score.putts is not None
        ]
        three_putt_count = sum(1 for score in scores_with_putts if score.putts >= 3)
        holes_with_putt_data = len(scores_with_putts)
        three_putt_percentage = (
            (three_putt_count / holes_with_putt_data) * 100.0
            if holes_with_putt_data
            else 0.0
        )

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


def three_putt_averages(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    """Three-putts a round, and the average of each round's three-putt rate, to a tenth.

    Only rounds with putts recorded count: a round without them has no three-putts to miss.
    Both are null when no round has putts.
    """
    recorded = [row for row in three_putts_per_round(rounds) if row["holes_with_putt_data"] > 0]
    if not recorded:
        return {"per_round": None, "rate": None}
    return {
        "per_round": round_half_up(sum(r["three_putt_count"] for r in recorded) / len(recorded)),
        "rate": round_half_up(sum(r["three_putt_percentage"] for r in recorded) / len(recorded)),
    }


def three_putts_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    """Selected round 3-putts vs trailing averages."""
    return metric_comparison_snapshot(
        three_putts_per_round(list(rounds)),
        primary_key="three_putt_count",
        secondary_key="three_putt_percentage",
        round_index=round_index,
        selected_label="Selected Round",
    )


def scrambling_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Scrambling by round using the user's rule:
    - Opportunity: hole where GIR is False
    - Success: opportunity hole where strokes <= par (par or better)
    """
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        opportunities = 0
        successes = 0

        if round_obj.course:
            for score in _valid_hole_scores(round_obj):
                if (
                    score.hole_number is None
                    or score.green_in_regulation is None
                    or score.strokes is None
                ):
                    continue
                hole = round_obj.course.get_hole(score.hole_number)
                if not hole or hole.par is None:
                    continue

                if score.green_in_regulation is False:
                    opportunities += 1
                    if score.strokes == hole.par:
                        successes += 1

        percentage = (successes / opportunities * 100.0) if opportunities else None
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "scramble_opportunities": opportunities,
                "scramble_successes": successes,
                "scramble_failures": opportunities - successes,
                "scrambling_percentage": percentage,
            }
        )
    return results


def up_and_down_trend(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Up & Down: hole where GIR is missed and player finishes with <= 1 putt.
    Unlike scrambling, requires no course/par — works on any round.
    Success: green_in_regulation is False AND putts <= 1 (includes holed out from off green).
    """
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        opportunities = 0
        successes = 0
        for score in _valid_hole_scores(round_obj):
            if score.green_in_regulation is None or score.putts is None:
                continue
            if score.green_in_regulation is False:
                opportunities += 1
                if score.putts <= 1:
                    successes += 1
        percentage = (successes / opportunities * 100.0) if opportunities else None
        results.append({
            "round_index": index,
            "round_id": round_obj.id,
            "opportunities": opportunities,
            "successes": successes,
            "percentage": round(percentage, 1) if percentage is not None else None,
        })
    return results


def scrambling_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    """Selected round scrambling vs trailing averages."""
    return metric_comparison_snapshot(
        scrambling_per_round(list(rounds)),
        primary_key="scramble_successes",
        secondary_key="scrambling_percentage",
        round_index=round_index,
        selected_label="Selected Round",
    )


def score_trend(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Return total score trend data by round."""
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        total_score = round_obj.calculate_total_score()
        total_to_par = round_obj.total_to_par()
        course_name = (
            round_obj.course.name if round_obj.course else round_obj.course_name_played
        )
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "total_score": total_score,
                "to_par": total_to_par,
                "par": round_obj.scored_par() if total_score is not None else None,
                "course_name": course_name,
            }
        )
    return results


def best_round_ranks(rounds: List[Round]) -> Dict[int, int]:
    """Each round's place among `rounds`, best first, keyed by its position in the list. Rounds
    compare on to par, so a par 70 and a par 72 read alike, and every full round comes before the
    nines and rounds cut short, which only compete with each other. A round with no to par has
    no place. Ties keep the list's order."""
    ranked = sorted(
        (i for i, r in enumerate(rounds) if r.total_to_par() is not None),
        key=lambda i: (rounds[i].holes_played() < 18, rounds[i].total_to_par()),
    )
    return {i: place for place, i in enumerate(ranked, start=1)}


def worst_round_ranks(rounds: List[Round]) -> Dict[int, int]:
    """Each round's place among `rounds`, worst first: the full rounds furthest over par, then the
    nines and rounds cut short the same way, so a nine is never the worst round. Like
    `best_round_ranks`, a round with no to par has no place and ties keep the list's order."""
    ranked = sorted(
        (i for i, r in enumerate(rounds) if r.total_to_par() is not None),
        key=lambda i: (rounds[i].holes_played() < 18, -rounds[i].total_to_par()),
    )
    return {i: place for place, i in enumerate(ranked, start=1)}


def best_round(rounds: List[Round]) -> Optional[Round]:
    """The best of `rounds`, the one the round list puts first (`best_round_ranks`): the full
    round lowest to par, or the best nine when there is no full round. A nine never beats a full
    round. Ties go to the earlier round in the list, so pass the rounds newest first for the newest."""
    ranks = best_round_ranks(rounds)
    return next((rounds[i] for i, place in ranks.items() if place == 1), None)


def full_rounds(rounds: Iterable[Round]) -> List[Round]:
    """The rounds of 18 holes or more: the ones a whole-round record, a score break or a
    per-round milestone is set in, so a nine's total is never read as a round's."""
    return [r for r in rounds if r.holes_played() >= 18]


def worst_round(rounds: List[Round]) -> Optional[Round]:
    """The worst of `rounds`, the one `worst_round_ranks` puts first: the full round furthest over
    par, or the worst nine when there is no full round. Ties go to the earlier round in the list."""
    ranks = worst_round_ranks(rounds)
    return next((rounds[i] for i, place in ranks.items() if place == 1), None)


def course_record(rounds: List[Round]) -> Dict[str, Any]:
    """
    A golfer's record at one course, from their rounds there newest first: how many they have
    played and when they last did, their average score and its average to par, and their best
    and worst rounds. The average is over the full rounds, or over the nines when there is no
    full round, so a nine's total never pulls an 18-hole average down; best and worst follow the
    same rule (`best_round`, `worst_round`).
    """
    full = full_rounds(rounds)
    counted = full or rounds
    scores = [s for s in (r.calculate_total_score() for r in counted) if s is not None]
    to_pars = [t for t in (r.total_to_par() for r in counted) if t is not None]
    dates = [r.date for r in rounds if r.date is not None]
    return {
        "rounds_played": len(rounds),
        "last_played": max(dates) if dates else None,
        "scoring_average": sum(scores) / len(scores) if scores else None,
        "scoring_average_to_par": sum(to_pars) / len(to_pars) if to_pars else None,
        "best_round": best_round(rounds),
        "worst_round": worst_round(rounds),
    }


def score_trend_with_rolling_average(rounds: Iterable[Round], window: int = 5) -> List[Dict[str, Any]]:
    """`score_trend`, with each round's average over it and the `window - 1` rounds before it."""
    rows = score_trend(rounds)
    for row, average in zip(rows, rolling_average([row["total_score"] for row in rows], window)):
        row["rolling_average"] = average
    return rows


def net_score_trend(
    rounds: Iterable[Round],
    current_handicap_index: Optional[float],
) -> List[Dict[str, Any]]:
    """Return net score trend data by round.

    Net score = gross score - course handicap, where course handicap uses the
    player's current HI applied to each round's tee data, as the round's own
    page shows it (`handicap.round_net_score`). Rounds without tee rating data,
    and nines, still appear but with net_score = None.
    """
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        course_name = (
            round_obj.course.name if round_obj.course else round_obj.course_name_played
        )
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "gross_score": round_obj.calculate_total_score(),
                "course_handicap": round_course_handicap(round_obj, current_handicap_index),
                "net_score": round_net_score(round_obj, current_handicap_index),
                "course_name": course_name,
                "to_par": round_obj.total_to_par(),
            }
        )
    return results


def score_trend_on_this_course(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Score trend for rounds on a single course.

    Rows are ordered by round date (oldest to newest) when date values are available.
    """
    indexed_rounds = list(enumerate(rounds))
    ordered_rounds = sorted(
        indexed_rounds,
        key=lambda pair: (
            pair[1].date is None,
            pair[1].date if pair[1].date is not None else pair[0],
            pair[0],
        ),
    )

    results: List[Dict[str, Any]] = []
    for index, (_, round_obj) in enumerate(ordered_rounds, start=1):
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "date": round_obj.date,
                "total_score": round_obj.calculate_total_score(),
                "to_par": round_obj.total_to_par(),
            }
        )
    return results


def gir_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Return GIR totals and percentage by round."""
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        holes_played = len(_valid_hole_scores(round_obj))
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
    """Selected round GIR vs trailing averages."""
    return metric_comparison_snapshot(
        gir_per_round(list(rounds)),
        primary_key="total_gir",
        secondary_key="gir_percentage",
        round_index=round_index,
        selected_label="Selected Round",
    )


def putts_per_gir(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Return putts-per-GIR by round.

    Formula:
    - putts_on_gir: sum(putts on holes where GIR is True)
    - putts_per_gir: putts_on_gir / GIR count
    """
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        gir_scores = [
            score for score in _valid_hole_scores(round_obj)
            if score.green_in_regulation is True
        ]
        gir_count = len(gir_scores)
        putts_on_gir = sum(score.putts for score in gir_scores if score.putts is not None)
        gir_with_putt_data = sum(1 for score in gir_scores if score.putts is not None)
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
    """Selected round putts-per-GIR vs trailing averages."""
    return metric_comparison_snapshot(
        putts_per_gir(list(rounds)),
        primary_key="putts_per_gir",
        secondary_key="putts_on_gir",
        round_index=round_index,
        selected_label="Selected Round",
    )


def overall_putts_per_gir(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    """Aggregate putts-on-GIR and putts-per-GIR across all rounds."""
    total_putts_on_gir = 0
    total_gir = 0
    rounds_with_data = 0

    for round_obj in rounds:
        gir_scores = [
            score for score in _valid_hole_scores(round_obj)
            if score.green_in_regulation is True
        ]
        gir_count = len(gir_scores)
        if gir_count:
            rounds_with_data += 1

        total_gir += gir_count
        total_putts_on_gir += sum(score.putts for score in gir_scores if score.putts is not None)

    return {
        "rounds_with_data": float(rounds_with_data),
        "total_gir": float(total_gir),
        "total_putts_on_gir": float(total_putts_on_gir),
        "putts_per_gir": (total_putts_on_gir / total_gir) if total_gir else None,
    }


def overall_gir_percentage(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    """Aggregate GIR percentage across all rounds."""
    total_holes = 0
    total_gir = 0
    rounds_with_data = 0

    for round_obj in rounds:
        hole_scores = _valid_hole_scores(round_obj)
        holes_played = len(hole_scores)
        gir = round_obj.get_total_gir()
        if holes_played:
            total_holes += holes_played
            if gir is not None:
                total_gir += gir
                rounds_with_data += 1

    misses = total_holes - total_gir
    return {
        "rounds_with_data": float(rounds_with_data),
        "holes_played": float(total_holes),
        "total_gir": float(total_gir),
        "total_missed_gir": float(misses),
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
        for hole_score in _valid_hole_scores(round_obj):
            if (
                hole_score.hole_number is None
                or hole_score.strokes is None
                or hole_score.green_in_regulation is None
            ):
                continue

            par = round_obj.get_hole_par(hole_score.hole_number)
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
            row[name] = (buckets[bucket][name] / totals[bucket] * 100.0) if totals[bucket] else 0.0
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
        if not round_obj.course:
            continue

        for hole_score in _valid_hole_scores(round_obj):
            if (
                hole_score.hole_number is None
                or hole_score.strokes is None
                or hole_score.green_in_regulation is None
            ):
                continue

            hole = round_obj.course.get_hole(hole_score.hole_number)
            if not hole or hole.par is None:
                continue

            bucket = "GIR" if hole_score.green_in_regulation else "No GIR"
            entry = buckets[bucket]
            entry["strokes_sum"] += hole_score.strokes
            entry["to_par_sum"] += hole_score.strokes - hole.par
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


def score_variance_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Aggregate scoring consistency by hole using score standard deviation.

    Higher standard deviation indicates less consistent scoring on that hole.
    """
    by_hole: Dict[int, Dict[str, Any]] = {}

    for round_obj in rounds:
        if not round_obj.course:
            continue

        for hole_score in _valid_hole_scores(round_obj):
            if hole_score.hole_number is None or hole_score.strokes is None:
                continue

            hole = round_obj.course.get_hole(hole_score.hole_number)
            if not hole or hole.par is None:
                continue

            entry = by_hole.setdefault(
                hole_score.hole_number,
                {"hole_number": hole_score.hole_number, "par": hole.par, "strokes": []},
            )
            entry["strokes"].append(hole_score.strokes)

    rows: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        strokes: List[int] = entry["strokes"]
        sample_size = len(strokes)
        mean_score = sum(strokes) / sample_size if sample_size else 0.0
        variance = (
            sum((score - mean_score) ** 2 for score in strokes) / sample_size if sample_size else 0.0
        )
        rows.append(
            {
                "hole_number": hole_number,
                "par": entry["par"],
                "sample_size": sample_size,
                "average_score": mean_score if sample_size else None,
                "score_variance": variance if sample_size else None,
                "score_std_dev": math.sqrt(variance) if sample_size else None,
            }
        )

    rows.sort(key=lambda row: (-(row["score_std_dev"] or 0.0), row["hole_number"]))
    for rank, row in enumerate(rows, start=1):
        row["variance_rank"] = rank

    return rows


def scoring_vs_hole_handicap(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Aggregate average score-to-par by hole handicap.

    Output rows:
    - handicap: 1-18
    - average_to_par: mean(strokes - par)
    - sample_size: number of scored holes used
    """
    by_handicap: Dict[int, List[int]] = {}

    for round_obj in rounds:
        for hole_score in _valid_hole_scores(round_obj):
            if hole_score.hole_number is None or hole_score.strokes is None:
                continue

            par = round_obj.get_hole_par(hole_score.hole_number)
            handicap = (
                round_obj.course.get_hole(hole_score.hole_number).handicap
                if round_obj.course
                else hole_score.handicap_played
            )
            if par is None or handicap is None:
                continue

            to_par = hole_score.strokes - par
            by_handicap.setdefault(handicap, []).append(to_par)

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

    for round_obj in rounds:
        if not round_obj.course:
            continue

        for hole_score in _valid_hole_scores(round_obj):
            if hole_score.hole_number is None or hole_score.strokes is None:
                continue
            hole = round_obj.course.get_hole(hole_score.hole_number)
            if not hole or hole.par is None:
                continue

            entry = by_hole.setdefault(
                hole_score.hole_number,
                {"hole_number": hole_score.hole_number, "par": hole.par, "strokes": [], "to_par": []},
            )
            entry["strokes"].append(hole_score.strokes)
            entry["to_par"].append(hole_score.strokes - hole.par)

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


def hole_to_par_nines(by_hole: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
    """
    The player's per-hole averages to par summed over the front nine, the back nine and every
    hole: the Out, In and Total of their row on the course scorecard. Takes the rows
    `average_score_relative_to_par_by_hole` builds; a nine with no hole played is null.
    """

    def total(holes: range) -> Optional[float]:
        averages = [row["average_to_par"] for row in by_hole if row["hole_number"] in holes]
        return sum(averages) if averages else None

    return {"front_nine": total(FRONT_NINE), "back_nine": total(BACK_NINE), "total": total(range(1, HOLES_PER_ROUND + 1))}


def gir_percentage_nines(by_hole: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
    """
    The share of greens hit (0-100) over the front nine, the back nine and every hole, pooling the
    holes' greens rather than averaging their rates: the Greens row's Out, In and Total. Takes the
    rows `gir_percentage_by_hole` builds; a nine with no green recorded is null.
    """

    def share(holes: range) -> Optional[float]:
        rows = [row for row in by_hole if row["hole_number"] in holes]
        samples = sum(row["sample_size"] for row in rows)
        return sum(row["gir_hits"] for row in rows) / samples * 100.0 if samples else None

    return {"front_nine": share(FRONT_NINE), "back_nine": share(BACK_NINE), "total": share(range(1, HOLES_PER_ROUND + 1))}


def course_hole_stats(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    How each hole of one course plays for the golfer, one row a hole in course order: its par, how
    many times they've played it, their average score and to par on it, where it ranks by that to
    par (`course_difficulty_profile_by_hole`: 1 is the hardest), how far their score swings (the
    standard deviation, null under two rounds), the greens they hit (0-100) and their average putts
    (null where none were recorded), and the share of each kind of score (0-100).

    The course page's hole charts read these rows: one row a hole rather than a list per figure.
    """
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
                "average_putts": putts[hole_number]["average_putts"] if hole_number in putts else None,
                "score_mix": {
                    kind: kinds[name] if kinds else 0.0
                    for kind, name in zip(SCORE_KINDS, SCORE_TYPE_ORDER)
                },
            }
        )
    return rows


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
    """Aggregate GIR percentage by hole number for rounds on the same course."""
    by_hole: Dict[int, Dict[str, Any]] = {}

    for round_obj in rounds:
        if not round_obj.course:
            continue

        for hole_score in _valid_hole_scores(round_obj):
            if hole_score.hole_number is None or hole_score.green_in_regulation is None:
                continue

            hole = round_obj.course.get_hole(hole_score.hole_number)
            if not hole or hole.par is None:
                continue

            entry = by_hole.setdefault(
                hole_score.hole_number,
                {
                    "hole_number": hole_score.hole_number,
                    "par": hole.par,
                    "gir_hits": 0,
                    "sample_size": 0,
                },
            )

            entry["sample_size"] += 1
            if hole_score.green_in_regulation:
                entry["gir_hits"] += 1

    results: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        sample_size = entry["sample_size"]
        gir_hits = entry["gir_hits"]
        results.append(
            {
                "hole_number": hole_number,
                "par": entry["par"],
                "gir_hits": gir_hits,
                "sample_size": sample_size,
                "gir_percentage": (gir_hits / sample_size) * 100.0 if sample_size else 0.0,
            }
        )

    return results


def average_putts_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Aggregate average putts by hole number for rounds on the same course."""
    by_hole: Dict[int, Dict[str, Any]] = {}

    for round_obj in rounds:
        if not round_obj.course:
            continue

        valid_scores = list(_valid_hole_scores(round_obj))
        # Skip rounds where any scored hole is missing putts (incomplete putt data)
        if any(hs.putts is None for hs in valid_scores):
            continue

        for hole_score in valid_scores:
            if hole_score.hole_number is None or hole_score.putts is None:
                continue

            hole = round_obj.course.get_hole(hole_score.hole_number)
            if not hole or hole.par is None:
                continue

            entry = by_hole.setdefault(
                hole_score.hole_number,
                {
                    "hole_number": hole_score.hole_number,
                    "par": hole.par,
                    "putts": [],
                },
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

    for round_obj in rounds:
        for hole_score in _valid_hole_scores(round_obj):
            if hole_score.hole_number is None or hole_score.strokes is None:
                continue

            par = round_obj.get_hole_par(hole_score.hole_number)
            if par is None or par not in (3, 4, 5):
                continue

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


def scoring_by_yardage_buckets(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Aggregate avg score-to-par and GIR% by yardage bucket within each par.

    Buckets:
      Par 3: <150, 150-199, 200+
      Par 4: <350, 350-399, 400-449, 450+
      Par 5: <500, 500-549, 550+

    Requires round to have a course + tee with hole_yardages populated.
    Returns rows sorted by par then bucket_order.
    """
    BUCKETS = {
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

    # key: (par, bucket_order) → {"to_par": [...], "gir": [...], "label": str}
    by_bucket: Dict[tuple, Dict[str, Any]] = {}

    for round_obj in rounds:
        if not round_obj.course:
            continue
        tee = _resolve_tee_for_yardage(round_obj)
        if not tee:
            continue

        for hole_score in _valid_hole_scores(round_obj):
            if hole_score.hole_number is None or hole_score.strokes is None:
                continue

            hole = round_obj.course.get_hole(hole_score.hole_number)
            if not hole or hole.par not in (3, 4, 5):
                continue

            yardage = tee.hole_yardages.get(hole_score.hole_number)
            if yardage is None:
                continue

            for (lo, hi, order, label) in BUCKETS[hole.par]:
                if lo <= yardage <= hi:
                    key = (hole.par, order)
                    if key not in by_bucket:
                        by_bucket[key] = {"par": hole.par, "order": order, "label": label, "to_par": [], "yardages": [], "gir": []}
                    by_bucket[key]["to_par"].append(hole_score.strokes - hole.par)
                    by_bucket[key]["yardages"].append(yardage)
                    if hole_score.green_in_regulation is not None:
                        by_bucket[key]["gir"].append(1 if hole_score.green_in_regulation else 0)
                    break

    results: List[Dict[str, Any]] = []
    for key in sorted(by_bucket):
        entry = by_bucket[key]
        to_par_vals = entry["to_par"]
        gir_vals = entry["gir"]
        average_to_par = sum(to_par_vals) / len(to_par_vals)
        results.append({
            "par": entry["par"],
            "bucket_label": entry["label"],
            "bucket_order": entry["order"],
            "average_to_par": average_to_par,
            "average_strokes": entry["par"] + average_to_par,
            "gir_percentage": (sum(gir_vals) / len(gir_vals) * 100.0) if gir_vals else None,
            "sample_size": len(to_par_vals),
            "score_mix": score_mix_from_to_par(to_par_vals),
            "raw_scores": [{"to_par": tp, "yardage": y} for tp, y in zip(to_par_vals, entry["yardages"])],
        })
    return results


def score_type_distribution_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """
    Percentage of holes by score type for each round.

    Categories:
    - eagle (includes eagle or better)
    - birdie, par, bogey, double_bogey, triple_bogey, quad_bogey

    Anything worse than quad bogey is counted as quad_bogey.
    """
    results: List[Dict[str, Any]] = []

    for index, round_obj in enumerate(rounds, start=1):
        counts = {name: 0 for name in SCORE_TYPE_ORDER}
        total = 0

        for hole_score in _valid_hole_scores(round_obj):
            if hole_score.hole_number is None or hole_score.strokes is None:
                continue
            par = round_obj.get_hole_par(hole_score.hole_number)
            if par is None:
                continue
            score_type = _score_type_from_to_par(hole_score.strokes - par)
            counts[score_type] += 1
            total += 1

        row: Dict[str, Any] = {
            "round_index": index,
            "round_id": round_obj.id,
            "holes_counted": total,
        }
        for name in SCORE_TYPE_ORDER:
            row[name] = (counts[name] / total * 100.0) if total else 0.0
        results.append(row)

    return results


def score_type_distribution_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Score-type percentage distribution by hole number for a specific course."""
    by_hole: Dict[int, Dict[str, Any]] = {}

    for round_obj in rounds:
        if not round_obj.course:
            continue

        for hole_score in _valid_hole_scores(round_obj):
            if hole_score.hole_number is None or hole_score.strokes is None:
                continue
            hole = round_obj.course.get_hole(hole_score.hole_number)
            if not hole or hole.par is None:
                continue

            entry = by_hole.setdefault(
                hole_score.hole_number,
                {
                    "hole_number": hole_score.hole_number,
                    "par": hole.par,
                    "counts": {name: 0 for name in SCORE_TYPE_ORDER},
                    "sample_size": 0,
                },
            )

            score_type = _score_type_from_to_par(hole_score.strokes - hole.par)
            entry["counts"][score_type] += 1
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
            count = entry["counts"][name]
            row[name] = (count / sample_size) * 100.0 if sample_size else 0.0
        results.append(row)

    return results
