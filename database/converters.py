"""Conversion between asyncpg database rows and Pydantic domain models.

Centralizes all mapping logic between the normalized DB schema
and the nested Pydantic models.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import ValidationError

from models import Course, Hole, Tee, TeeRating, HoleScore, Round, User, UserTee
from database.exceptions import IntegrityError


# ================================================================
# Row -> Model (reads)
# ================================================================


def hole_from_row(row) -> Hole:
    """courses.holes row -> Hole model."""
    return Hole(
        number=row["hole_number"],
        par=row["par"],
        handicap=row["handicap"],
    )


def tee_from_row(tee_row, yardage_rows: list, rating_rows=None) -> Tee:
    """courses.tees row + courses.tee_yardages rows -> Tee model."""
    hole_yardages = {r["hole_number"]: r["yardage"] for r in yardage_rows}
    return Tee(
        color=tee_row["color"],
        slope_rating=float(tee_row["slope_rating"]) if tee_row["slope_rating"] is not None else None,
        course_rating=float(tee_row["course_rating"]) if tee_row["course_rating"] is not None else None,
        hole_yardages=hole_yardages,
        yardage_holes=tee_row.get("yardage_holes"),
        rating_holes=tee_row.get("rating_holes"),
        total_yardage=tee_row.get("total_yardage"),
        ratings=[rating_from_row(row) for row in (rating_rows or [])],
    )


def rating_from_row(row) -> TeeRating:
    return TeeRating(
        hole_numbers=row["hole_numbers"], course_rating=row["course_rating"], slope_rating=row["slope_rating"]
    )


def course_from_rows(
    course_row,
    hole_rows: list,
    tee_rows: list,
    yardage_rows_by_tee: Dict[UUID, list],
    rating_rows_by_tee=None,
) -> Course:
    """Assemble a course with its holes, tees, yardages and rating coverage."""
    holes = sorted(
        [hole_from_row(r) for r in hole_rows],
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
        user_id=str(course_row["user_id"]) if course_row["user_id"] else None,
    )


def hole_score_from_row(row) -> HoleScore:
    """users.hole_scores row -> HoleScore model."""
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
    round_row,
    hole_score_rows: list,
    course: Optional[Course],
    tee_color: Optional[str] = None,
    user_tee: Optional["UserTee"] = None,
) -> Round:
    """Assemble a Round from DB rows + pre-loaded Course."""
    hole_scores = sorted(
        [hole_score_from_row(r) for r in hole_score_rows],
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


def user_from_row(user_row, rounds: Optional[List[Round]] = None) -> User:
    """users.users row -> User model."""
    return User(
        id=str(user_row["id"]),
        friend_code=user_row.get("friend_code"),
        name=user_row["name"],
        email=user_row["email"],
        email_verified=bool(user_row.get("email_verified", False)),
        email_verified_at=user_row.get("email_verified_at"),
        home_course_id=str(user_row["home_course_id"]) if user_row["home_course_id"] else None,
        handicap=float(user_row["handicap_index"]) if user_row["handicap_index"] is not None else None,
        rounds=rounds or [],
        created_at=user_row["created_at"],
        last_handicap_update=user_row.get("last_handicap_update"),
        scoring_goal=user_row.get("scoring_goal"),
        scoring_goal_nine=user_row.get("scoring_goal_nine"),
    )


# ================================================================
# Model -> Row dict (writes)
# ================================================================


def course_to_row(course: Course, user_id: Optional[UUID] = None) -> dict:
    """Course -> dict for courses.courses INSERT."""
    return {
        "name": course.name,
        "external_course_id": course.external_course_id,
        "location": course.location,
        "par": course.get_par(),
        "total_holes": len(course.get_expected_holes()) if course.get_expected_holes() is not None else None,
        "user_id": user_id,
    }


def hole_to_row(hole: Hole, course_id: UUID) -> tuple:
    """Hole -> tuple for courses.holes INSERT (for executemany)."""
    return (course_id, hole.number, hole.par, hole.handicap)


def tee_to_row(tee: Tee, course_id: UUID) -> tuple:
    """Tee -> tuple for courses.tees INSERT."""
    return (
        course_id,
        tee.color,
        tee.slope_rating,
        tee.course_rating,
        tee.yardage_holes,
        tee.rating_holes,
        tee.get_total_yardage() if not tee.hole_yardages else None,
    )


def tee_ratings_to_rows(tee, tee_id: UUID) -> list:
    return [(tee_id, rating.hole_numbers, rating.course_rating, rating.slope_rating) for rating in tee.ratings]


def tee_yardages_to_rows(tee: Tee, tee_id: UUID) -> list:
    """Tee.hole_yardages -> list of tuples for courses.tee_yardages INSERT."""
    return [(tee_id, hole_num, yardage) for hole_num, yardage in sorted(tee.hole_yardages.items())]


def hole_score_to_row(hs: HoleScore, round_id: UUID, hole_id: Optional[UUID]) -> tuple:
    """HoleScore -> tuple for users.hole_scores INSERT (hole_id may be None)."""
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
) -> dict:
    """Round -> dict for users.rounds INSERT."""
    scored = round_._scored_holes()
    if not scored or any(score.hole_number is None for score in round_.hole_scores):
        raise IntegrityError("A saved round requires unique numbered holes and at least one score")

    def supplied_total(field, getter):
        # Observed values remain derived; only genuinely supplied summaries need storage.
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


def user_to_row(user: User) -> dict:
    """User -> dict for users.users INSERT."""
    return {
        "friend_code": user.friend_code,
        "name": user.name,
        "email": user.email,
        "handicap_index": user.handicap,
        "home_course_id": UUID(user.home_course_id) if user.home_course_id else None,
        "scoring_goal": user.scoring_goal,
        "scoring_goal_nine": user.scoring_goal_nine,
    }


def user_tee_from_row(row, rating_rows=None) -> UserTee:
    """users.user_tees row -> UserTee model."""
    hole_yardages = row["hole_yardages"] if row["hole_yardages"] is not None else {}
    try:
        if isinstance(hole_yardages, str):
            hole_yardages = json.loads(hole_yardages)
        # Preserve raw keys until the shared validator can detect normalized aliases.
        return UserTee(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            course_id=str(row["course_id"]) if row["course_id"] else None,
            name=row["name"],
            slope_rating=float(row["slope_rating"]) if row["slope_rating"] is not None else None,
            course_rating=float(row["course_rating"]) if row["course_rating"] is not None else None,
            hole_yardages=hole_yardages,
            yardage_holes=row.get("yardage_holes"),
            rating_holes=row.get("rating_holes"),
            total_yardage=row.get("total_yardage"),
            ratings=[rating_from_row(rating) for rating in (rating_rows or [])],
            created_at=row["created_at"],
        )
    except (ValidationError, ValueError, TypeError) as error:
        raise IntegrityError("Invalid stored user tee data") from error


def user_tee_to_row(ut: UserTee) -> dict:
    """UserTee -> dict for users.user_tees INSERT."""
    return {
        "user_id": UUID(ut.user_id),
        "course_id": UUID(ut.course_id) if ut.course_id else None,
        "name": ut.name,
        "slope_rating": ut.slope_rating,
        "course_rating": ut.course_rating,
        "hole_yardages": {str(k): v for k, v in (ut.hole_yardages or {}).items()},
        "yardage_holes": ut.yardage_holes,
        "rating_holes": ut.rating_holes,
        "total_yardage": ut.get_total_yardage() if not ut.hole_yardages else None,
    }
