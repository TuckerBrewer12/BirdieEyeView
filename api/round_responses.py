"""Round responses, built one way from the Round model so every endpoint agrees."""

from api.course_responses import course_detail
from api.schemas import (
    HoleScoreResponse,
    NineFigures,
    Nines,
    RoundFigures,
    RoundResponse,
    RoundSummaryResponse,
    ScoreCounts,
)
from models import Round


def _hole_scores(round_: Round) -> list[HoleScoreResponse]:
    return [
        HoleScoreResponse(
            **hs.model_dump(),
            par=round_.get_hole_par(hs.hole_number),
            handicap=round_.get_hole_handicap(hs.hole_number),
            yardage=round_.get_hole_yardage(hs.hole_number),
            to_par=round_.score_to_par(hs.hole_number),
            kind=round_.get_score_kind(hs.hole_number),
        )
        for hs in round_.hole_scores
        if hs.hole_number is not None
    ]


def _nine(round_: Round, first: int, last: int) -> NineFigures:
    return NineFigures(
        par=round_.nine_par(first, last),
        to_par=round_.nine_to_par(first, last),
        putts=round_.nine_putts(first, last),
        gir=round_.nine_gir(first, last),
        yards=round_.nine_yardage(first, last),
    )


def _figures(round_: Round) -> dict:
    return RoundFigures(
        total_score=round_.calculate_total_score(),
        par=round_.get_par(),
        to_par=round_.total_to_par(),
        front_nine=round_.calculate_front_nine(),
        back_nine=round_.calculate_back_nine(),
        total_putts=round_.get_total_putts(),
        total_gir=round_.get_total_gir(),
        fairways_hit=round_.get_fairways_hit(),
        nines=Nines(front=_nine(round_, 1, 9), back=_nine(round_, 10, 18)),
        yards=round_.get_total_yardage(),
        score_counts=ScoreCounts(**round_.get_score_counts()),
    ).model_dump()


def round_summary(round_: Round) -> RoundSummaryResponse:
    """A round for list views."""
    return RoundSummaryResponse(
        **_figures(round_),
        id=str(round_.id),
        course_id=str(round_.course.id) if round_.course and round_.course.id else None,
        course_name=round_.course_name_played or (round_.course.name if round_.course else None),
        course_location=round_.course.location if round_.course else None,
        course_par=round_.course.get_par() if round_.course else None,
        tee_box=round_.tee_box,
        date=round_.date,
        notes=round_.notes,
        hole_scores=_hole_scores(round_),
    )


def round_detail(round_: Round) -> RoundResponse:
    """A full round, as the detail page and the edit form read it."""
    return RoundResponse(
        **_figures(round_),
        id=round_.id,
        course=course_detail(round_.course) if round_.course else None,
        tee_box=round_.tee_box,
        date=round_.date,
        weather_conditions=round_.weather_conditions,
        notes=round_.notes,
        course_name_played=round_.course_name_played,
        user_tee=round_.user_tee,
        hole_scores=_hole_scores(round_),
    )
