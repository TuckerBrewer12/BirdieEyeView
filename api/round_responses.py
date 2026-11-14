from typing import Dict, List, Optional

from analytics.handicap import round_course_handicap, round_net_score
from analytics.stats import best_round_ranks, worst_round_ranks
from api.course_responses import course_detail
from api.schemas import (
    HoleScoreResponse,
    HoleSummaryResponse,
    NineFigures,
    Nines,
    RoundFigures,
    RoundResponse,
    RoundSummaryResponse,
    ScoreCounts,
)
from models import Round


def _hole_scores(round_: Round) -> list[HoleScoreResponse]:
    running = round_.running_to_par()
    return [
        HoleScoreResponse(
            **hs.model_dump(),
            par=round_.get_hole_par(hs.hole_number),
            handicap=round_.get_hole_handicap(hs.hole_number),
            yardage=round_.get_hole_yardage(hs.hole_number),
            to_par=round_.score_to_par(hs.hole_number),
            kind=round_.get_score_kind(hs.hole_number),
            three_putt=hs.is_three_putt(),
            running_to_par=running.get(hs.hole_number),
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
        holes_played=round_.holes_played(),
    ).model_dump()


def round_summary(
    round_: Round, best_rank: Optional[int] = None, worst_rank: Optional[int] = None
) -> RoundSummaryResponse:
    running = round_.running_to_par()
    return RoundSummaryResponse(
        id=str(round_.id),
        course_id=str(round_.course.id) if round_.course and round_.course.id else None,
        course_name=round_.course_name_played or (round_.course.name if round_.course else None),
        tee_box=round_.tee_box,
        date=round_.date,
        total_score=round_.calculate_total_score(),
        to_par=round_.total_to_par(),
        front_nine=round_.calculate_front_nine(),
        back_nine=round_.calculate_back_nine(),
        total_putts=round_.get_total_putts(),
        score_counts=ScoreCounts(**round_.get_score_counts()),
        hole_scores=[
            HoleSummaryResponse(
                hole_number=hs.hole_number,
                strokes=hs.strokes,
                kind=round_.get_score_kind(hs.hole_number),
                running_to_par=running.get(hs.hole_number),
            )
            for hs in round_.hole_scores
            if hs.hole_number is not None
        ],
        best_rank=best_rank,
        worst_rank=worst_rank,
    )


def round_list(rounds: List[Round]) -> List[RoundSummaryResponse]:
    best: Dict[int, int] = best_round_ranks(rounds)
    worst: Dict[int, int] = worst_round_ranks(rounds)
    return [round_summary(r, best.get(i), worst.get(i)) for i, r in enumerate(rounds)]


def round_detail(round_: Round, handicap_index: Optional[float] = None) -> RoundResponse:
    return RoundResponse(
        **_figures(round_),
        id=round_.id,
        course=course_detail(round_.course, handicap_index) if round_.course else None,
        tee_box=round_.tee_box,
        date=round_.date,
        weather_conditions=round_.weather_conditions,
        notes=round_.notes,
        course_name_played=round_.course_name_played,
        user_tee=round_.user_tee,
        hole_scores=_hole_scores(round_),
        course_handicap=round_course_handicap(round_, handicap_index),
        net_score=round_net_score(round_, handicap_index),
        worst_stretch=round_.worst_stretch(),
    )
