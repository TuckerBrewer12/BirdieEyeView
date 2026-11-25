from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from uuid import uuid4

from hypothesis import given, settings
from hypothesis import strategies as st

from analytics.handicap import (
    WHS_WINDOW,
    course_handicap,
    handicap_index,
    player_handicap_index,
    player_handicap_trend,
    round_half_up,
    whs_window,
)
from models import Course, Hole, HoleScore, Round, Tee, User

PARS = [4, 5, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 3, 4, 4, 5]
FULL_ROUND = tuple(range(1, 19))
RATING = 72.4
SLOPE = 130
START = datetime(2026, 1, 1, tzinfo=timezone.utc)

indexes = st.integers(min_value=-100, max_value=540).map(lambda tenths: tenths / 10)
slopes = st.one_of(st.just(113), st.integers(min_value=55, max_value=155))
course_ratings = st.integers(min_value=550, max_value=850).map(lambda tenths: tenths / 10)
pars = st.integers(min_value=27, max_value=80)
round_sets = st.lists(st.integers(min_value=0, max_value=54), min_size=3, max_size=30)

COURSE = Course(
    id=str(uuid4()),
    name="Presidio",
    par=sum(PARS),
    holes=[Hole(number=i + 1, par=p, handicap=i + 1) for i, p in enumerate(PARS)],
    tees=[Tee(color="Blue", course_rating=RATING, slope_rating=SLOPE, rating_holes=FULL_ROUND)],
)


def exact_course_handicap(index: float, slope: int, rating: float, par: int) -> int:
    raw = Decimal(str(index)) * slope / 113 + (Decimal(str(rating)) - par)
    return int(raw.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def scored_round(over: int, day: int) -> Round:
    each, extra = divmod(over, 18)
    return Round(
        id=str(uuid4()),
        course=COURSE,
        tee_box="Blue",
        date=START + timedelta(days=day),
        intended_holes=FULL_ROUND,
        hole_scores=[
            HoleScore(hole_number=i + 1, strokes=PARS[i] + each + (1 if i < extra else 0), putts=2)
            for i in range(18)
        ],
    )


def season(overs: list[int]) -> list[Round]:
    return [scored_round(over, day) for day, over in enumerate(overs)]


def differential(over: int) -> float:
    return round_half_up((sum(PARS) + over - RATING) * 113 / SLOPE, 1)


@given(indexes, slopes, course_ratings, pars)
def test_course_handicap_matches_the_exact_formula(index, slope, rating, par):
    assert course_handicap(index, slope, rating, par) == exact_course_handicap(index, slope, rating, par)


@given(st.integers(min_value=-100, max_value=540), st.integers(min_value=55, max_value=84), pars)
def test_an_exact_half_stroke_rounds_away_from_zero(index_tenths, rating_whole, par):
    index = index_tenths / 10
    rating = (rating_whole * 10 + (5 - index_tenths) % 10) / 10
    raw = Decimal(str(index)) + Decimal(str(rating)) - par
    assert abs(raw - int(raw)) == Decimal("0.5")
    assert course_handicap(index, 113, rating, par) == exact_course_handicap(index, 113, rating, par)


def test_half_strokes_that_floats_get_wrong_round_like_the_exact_sum():
    assert course_handicap(14.2, 113, 70.3, 72) == 13
    assert course_handicap(0.2, 113, 69.3, 70) == -1


@given(indexes, indexes, slopes, course_ratings, pars)
def test_a_higher_index_never_gets_fewer_strokes(a, b, slope, rating, par):
    low, high = sorted((a, b))
    assert course_handicap(low, slope, rating, par) <= course_handicap(high, slope, rating, par)


@given(st.integers(min_value=0, max_value=60))
def test_the_whs_window_counts_between_none_and_eight(rated):
    count, adjustment = whs_window(rated)
    assert 0 <= count <= min(rated, 8)
    assert adjustment <= 0
    if rated < 3:
        assert count == 0
    if rated >= WHS_WINDOW:
        assert (count, adjustment) == (8, 0.0)


@given(st.integers(min_value=3, max_value=59))
def test_more_rounds_never_count_fewer(rated):
    assert whs_window(rated)[0] <= whs_window(rated + 1)[0]


@settings(deadline=None)
@given(round_sets)
def test_the_index_sits_between_the_best_differential_and_the_average(overs):
    window = [differential(o) for o in overs[-WHS_WINDOW:]]
    _, adjustment = whs_window(len(window))
    index = handicap_index(season(overs))
    assert index is not None
    assert index <= sum(window) / len(window) + 0.05
    assert index >= min(window) + adjustment - 0.05
    assert index <= 54.0


@settings(deadline=None)
@given(round_sets, st.data())
def test_a_better_round_never_raises_the_index(overs, data):
    i = data.draw(st.integers(min_value=0, max_value=len(overs) - 1))
    better = data.draw(st.integers(min_value=0, max_value=overs[i]))
    improved = [*overs[:i], better, *overs[i + 1:]]
    assert handicap_index(season(improved)) <= handicap_index(season(overs))


@settings(deadline=None)
@given(round_sets, st.randoms(use_true_random=False))
def test_the_order_of_the_window_does_not_change_the_index(overs, rng):
    window = overs[-WHS_WINDOW:]
    shuffled = list(window)
    rng.shuffle(shuffled)
    assert handicap_index(season(shuffled)) == handicap_index(season(window))


@settings(deadline=None, max_examples=50)
@given(
    st.lists(st.integers(min_value=0, max_value=54), min_size=1, max_size=30),
    st.one_of(st.none(), indexes),
    st.one_of(st.none(), st.integers(min_value=0, max_value=30)),
)
def test_the_trend_ends_on_the_index_every_screen_shows(overs, seed, seed_day):
    user = User(
        id=str(uuid4()),
        handicap=seed,
        last_handicap_update=None if seed is None or seed_day is None else START + timedelta(days=seed_day),
    )
    history = season(overs)
    assert player_handicap_trend(user, history)[-1]["handicap_index"] == player_handicap_index(user, history)
