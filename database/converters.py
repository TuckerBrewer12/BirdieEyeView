import json
from collections.abc import Mapping, Sequence
from datetime import datetime
from typing import Any, Optional, TypeAlias
from uuid import UUID

from asyncpg import Record
from pydantic import ValidationError

from models import Course, Hole, Tee, TeeRating, HoleScore, Round, User, UserTee
from models.hole_layout import FRONT_NINE
from database.exceptions import IntegrityError

Row: TypeAlias = Mapping[str, Any] | Record


def _id_str(value: Any) -> Optional[str]:
    return str(value) if value else None


def _uuid(value: Optional[str]) -> Optional[UUID]:
    return UUID(value) if value else None


def _float(value: Any) -> Optional[float]:
    return float(value) if value is not None else None


def _decoded_json(raw: Any) -> Any:
    return json.loads(raw) if isinstance(raw, str) else raw


def hole_from_row(row: Row) -> Hole:
    return Hole(
        number=row["hole_number"],
        par=row["par"],
        handicap=row["handicap"],
    )


def tee_from_row(tee_row: Row, yardage_rows: Sequence[Row], rating_rows: Optional[Sequence[Row]] = None) -> Tee:
    return Tee(
        color=tee_row["color"],
        slope_rating=_float(tee_row["slope_rating"]),
        course_rating=_float(tee_row["course_rating"]),
        hole_yardages={r["hole_number"]: r["yardage"] for r in yardage_rows},
        yardage_holes=tee_row.get("yardage_holes"),
        rating_holes=tee_row.get("rating_holes"),
        total_yardage=tee_row.get("total_yardage"),
        ratings=[rating_from_row(row) for row in (rating_rows or [])],
    )


def rating_from_row(row: Row) -> TeeRating:
    return TeeRating(
        hole_numbers=row["hole_numbers"], course_rating=row["course_rating"], slope_rating=row["slope_rating"]
    )


def course_from_rows(
    course_row: Row,
    hole_rows: Sequence[Row],
    tee_rows: Sequence[Row],
    yardage_rows_by_tee: Mapping[UUID, Sequence[Row]],
    rating_rows_by_tee: Optional[Mapping[UUID, Sequence[Row]]] = None,
) -> Course:
    holes = sorted(
        (hole_from_row(r) for r in hole_rows),
        key=lambda h: h.number or 0,
    )
    tees = [
        tee_from_row(tr, yardage_rows_by_tee.get(tr["id"], []), (rating_rows_by_tee or {}).get(tr["id"], []))
        for tr in tee_rows
    ]
    return Course(
        id=str(course_row["id"]),
        name=course_row["name"],
        external_course_id=course_row["external_course_id"],
        location=course_row["location"],
        total_holes=course_row.get("total_holes"),
        par=course_row["par"],
        holes=holes,
        tees=tees,
        user_id=_id_str(course_row["user_id"]),
    )


def hole_score_from_row(row: Row) -> HoleScore:
    return HoleScore(
        hole_number=row["hole_number"],
        strokes=row["strokes"],
        net_score=row["net_score"],
        putts=row["putts"],
        shots_to_green=row["shots_to_green"],
        fairway_hit=row["fairway_hit"],
        green_in_regulation=row["green_in_regulation"],
        par_played=row["par_played"],
        handicap_played=row["handicap_played"],
        played=row.get("played"),
    )


def round_from_rows(
    round_row: Row,
    hole_score_rows: Sequence[Row],
    course: Optional[Course],
    tee_color: Optional[str] = None,
    user_tee: Optional[UserTee] = None,
) -> Round:
    hole_scores = sorted(
        (hole_score_from_row(r) for r in hole_score_rows),
        key=lambda hs: hs.hole_number or 0,
    )
    return Round(
        id=str(round_row["id"]),
        course=course,
        tee_box=tee_color,
        date=round_row["round_date"],
        hole_scores=hole_scores,
        weather_conditions=round_row["weather_conditions"],
        notes=round_row["notes"],
        course_name_played=round_row["course_name_played"],
        user_tee=user_tee,
        intended_holes=round_row.get("intended_holes"),
        total_putts=round_row.get("supplied_total_putts"),
        total_gir=round_row.get("supplied_total_gir"),
    )


def user_from_row(user_row: Row, rounds: Optional[list[Round]] = None) -> User:
    return User(
        id=str(user_row["id"]),
        friend_code=user_row.get("friend_code"),
        name=user_row["name"],
        email=user_row["email"],
        email_verified=bool(user_row.get("email_verified", False)),
        email_verified_at=user_row.get("email_verified_at"),
        home_course_id=_id_str(user_row["home_course_id"]),
        handicap=_float(user_row["handicap_index"]),
        rounds=rounds or [],
        created_at=user_row["created_at"],
        last_handicap_update=user_row.get("last_handicap_update"),
        scoring_goal=user_row.get("scoring_goal"),
        scoring_goal_nine=user_row.get("scoring_goal_nine"),
    )


def course_to_row(course: Course, user_id: Optional[UUID] = None) -> dict[str, Any]:
    expected = course.get_expected_holes()
    if expected is None and sorted(h.number for h in course.holes if h.number is not None) == list(FRONT_NINE):
        expected = FRONT_NINE
    return {
        "name": course.name,
        "external_course_id": course.external_course_id,
        "location": course.location,
        "par": course.get_par(),
        "total_holes": len(expected) if expected is not None else None,
        "user_id": user_id,
    }


def tee_to_row(tee: Tee, course_id: UUID) -> tuple:
    return (
        course_id,
        tee.color,
        tee.slope_rating,
        tee.course_rating,
        tee.yardage_holes,
        tee.rating_holes,
        tee.get_total_yardage() if not tee.hole_yardages else None,
    )


def tee_ratings_to_rows(tee: Tee | UserTee, tee_id: UUID) -> list[tuple]:
    return [(tee_id, rating.hole_numbers, rating.course_rating, rating.slope_rating) for rating in tee.ratings]


def tee_yardages_to_rows(tee: Tee, tee_id: UUID) -> list[tuple[UUID, int, int]]:
    return [(tee_id, hole_num, yardage) for hole_num, yardage in sorted(tee.hole_yardages.items())]


def hole_score_to_row(hs: HoleScore, round_id: UUID, hole_id: Optional[UUID]) -> tuple:
    return (
        round_id,
        hole_id,
        hs.hole_number,
        hs.strokes,
        hs.net_score,
        hs.putts,
        hs.shots_to_green,
        hs.fairway_hit,
        hs.green_in_regulation,
        hs.par_played,
        hs.handicap_played,
        hs.played,
    )


def round_to_row(
    round_: Round,
    user_id: UUID,
    course_id: Optional[UUID] = None,
    tee_id: Optional[UUID] = None,
) -> dict[str, Any]:
    scored = round_.scored_holes()
    if not scored or any(score.hole_number is None for score in round_.hole_scores):
        raise IntegrityError("A saved round requires unique numbered holes and at least one score")

    def supplied_total(field, getter):
        return None if any(getattr(score, field) is not None for score in scored) else getter()

    return {
        "user_id": user_id,
        "course_id": course_id,
        "tee_id": tee_id,
        "round_date": round_.date.date() if isinstance(round_.date, datetime) else round_.date,
        "total_score": round_.calculate_total_score(),
        "is_complete": round_.is_complete(),
        "holes_played": len(scored),
        "intended_holes": round_.intended_holes,
        "supplied_total_putts": supplied_total("putts", round_.get_total_putts),
        "supplied_total_gir": supplied_total("green_in_regulation", round_.get_total_gir),
        "weather_conditions": round_.weather_conditions,
        "notes": round_.notes,
        "course_name_played": round_.course_name_played,
        "tee_box_played": round_.tee_box,
    }


def user_to_row(user: User) -> dict[str, Any]:
    return {
        "friend_code": user.friend_code,
        "name": user.name,
        "email": user.email,
        "handicap_index": user.handicap,
        "home_course_id": _uuid(user.home_course_id),
        "scoring_goal": user.scoring_goal,
        "scoring_goal_nine": user.scoring_goal_nine,
    }


def user_tee_from_row(row: Row, rating_rows: Optional[Sequence[Row]] = None) -> UserTee:
    stored_yardages = row["hole_yardages"]
    try:
        return UserTee(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            course_id=_id_str(row["course_id"]),
            name=row["name"],
            slope_rating=_float(row["slope_rating"]),
            course_rating=_float(row["course_rating"]),
            hole_yardages=_decoded_json(stored_yardages) if stored_yardages is not None else {},
            yardage_holes=row.get("yardage_holes"),
            rating_holes=row.get("rating_holes"),
            total_yardage=row.get("total_yardage"),
            ratings=[rating_from_row(rating) for rating in (rating_rows or [])],
            created_at=row["created_at"],
        )
    except (ValidationError, ValueError, TypeError) as error:
        raise IntegrityError("Invalid stored user tee data") from error


def user_tee_to_row(ut: UserTee) -> dict[str, Any]:
    return {
        "user_id": UUID(ut.user_id),
        "course_id": _uuid(ut.course_id),
        "name": ut.name,
        "slope_rating": ut.slope_rating,
        "course_rating": ut.course_rating,
        "hole_yardages": {str(k): v for k, v in (ut.hole_yardages or {}).items()},
        "yardage_holes": ut.yardage_holes,
        "rating_holes": ut.rating_holes,
        "total_yardage": ut.get_total_yardage() if not ut.hole_yardages else None,
    }


def round_from_summary_row(row: Row) -> Round:
    holes = _decoded_json(row["hole_scores"]) or []
    return Round(
        id=str(row["id"]),
        course=_summary_course(row, holes),
        tee_box=row["tee_box_played"],
        date=row["round_date"],
        intended_holes=row.get("intended_holes"),
        notes=row.get("notes"),
        total_putts=row.get("supplied_total_putts"),
        total_gir=row.get("supplied_total_gir"),
        hole_scores=[_summary_hole_score(h) for h in holes],
        course_name_played=row["course_name_played"],
    )


def _summary_course(row: Row, holes: Sequence[Mapping[str, Any]]) -> Optional[Course]:
    if not row["course_id"]:
        return None
    return Course(
        id=str(row["course_id"]),
        name=row["course_name"],
        par=row["course_par"],
        total_holes=row.get("course_total_holes"),
        holes=_summary_course_holes(row, holes),
    )


def _summary_course_holes(row: Row, holes: Sequence[Mapping[str, Any]]) -> list[Hole]:
    if "course_holes" in row:
        stored = row["course_holes"]
        return [Hole(**h) for h in (json.loads(stored) if isinstance(stored, str) else stored or [])]
    return [Hole(number=h["hole_number"], par=h["course_par"]) for h in holes if h["course_par"] is not None]


def _summary_hole_score(hole: Mapping[str, Any]) -> HoleScore:
    return HoleScore(
        hole_number=hole["hole_number"],
        strokes=hole["strokes"],
        played=hole.get("played"),
        putts=hole["putts"],
        green_in_regulation=hole["green_in_regulation"],
        par_played=hole["par_played"],
    )
