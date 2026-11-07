"""Property-based tests for the WHS maths in analytics/handicap.py.

Hypothesis generates the inputs (indexes, ratings, slopes, sets of rounds) and shrinks any
failure to the smallest case. The example tests in test_course_handicap.py pin known answers;
these pin the rules that have to hold for every golfer.
"""

from datetime import datetime, timedelta
from decimal import ROUND_FLOOR, Decimal
from uuid import uuid4

from hypothesis import given, settings
from hypothesis import strategies as st

from analytics.handicap import (
    WHS_ROUNDS,
    course_handicap,
    handicap_index,
    player_handicap_index,
    player_handicap_trend,
    whs_window,
)
from models import Course, Hole, HoleScore, Round, Tee, User

PARS = [4, 5, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 3, 4, 4, 5]  # par 72

# Inputs as golf has them: an index and a course rating in tenths, a whole-number slope.
indexes = st.integers(min_value=-100, max_value=540).map(lambda tenths: tenths / 10)
# 113 is the neutral slope, where the index passes through unchanged and exact half strokes are
# common; weight it so the rounding edge gets tried every run.
slopes = st.one_of(st.just(113), st.integers(min_value=55, max_value=155))
course_ratings = st.integers(min_value=550, max_value=850).map(lambda tenths: tenths / 10)
pars = st.integers(min_value=27, max_value=80)


def _exact_course_handicap(index: float, slope: int, rating: float, par: int) -> int:
    """The WHS formula in exact decimals, a half going up (towards plus)."""
    raw = Decimal(str(index)) * slope / 113 + (Decimal(str(rating)) - par)
    return int((raw + Decimal("0.5")).to_integral_value(rounding=ROUND_FLOOR))


@given(indexes, slopes, course_ratings, pars)
def test_course_handicap_matches_the_exact_formula(index, slope, rating, par):
    assert course_handicap(index, slope, rating, par) == _exact_course_handicap(index, slope, rating, par)


@given(
    st.integers(min_value=-100, max_value=540),
    st.integers(min_value=55, max_value=84),
    pars,
)
def test_an_exact_half_stroke_always_goes_up(index_tenths, rating_whole, par):
    """At slope 113 the index passes straight through, so pick a rating whose tenth makes the
    sum land on exactly .5. Floats get these wrong in about one case in five."""
    index = index_tenths / 10
    rating_tenth = (5 - index_tenths) % 10
    rating = (rating_whole * 10 + rating_tenth) / 10
    exact = _exact_course_handicap(index, 113, rating, par)
    raw = Decimal(str(index)) + Decimal(str(rating)) - par
    assert raw - int(raw) in (Decimal("0.5"), Decimal("-0.5"))
    assert course_handicap(index, 113, rating, par) == exact


def test_course_handicap_a_float_half_still_goes_up():
    # A case the half-stroke property found: 0.2 + (69.3 − 70) is −0.5, which plays off scratch.
    assert course_handicap(0.2, 113, 69.3, 70) == 0
    # 14.2 + (70.3 − 72) = 12.5 → 13.
    assert course_handicap(14.2, 113, 70.3, 72) == 13


@given(indexes, indexes, slopes, course_ratings, pars)
def test_a_higher_index_never_gets_fewer_strokes(a, b, slope, rating, par):
    low, high = sorted((a, b))
    assert course_handicap(low, slope, rating, par) <= course_handicap(high, slope, rating, par)


@given(st.integers(min_value=0, max_value=60))
def test_whs_window_is_sane(rated):
    count, adjustment = whs_window(rated)
    assert 0 <= count <= max(rated, 0)
    assert adjustment <= 0
    if rated < 3:
        assert count == 0
    if rated >= WHS_ROUNDS:
        assert (count, adjustment) == (8, 0.0)


@given(st.integers(min_value=3, max_value=59))
def test_whs_window_never_counts_fewer_with_more_rounds(rated):
    assert whs_window(rated)[0] <= whs_window(rated + 1)[0]


# --- the index over a set of rounds -------------------------------------------------------

COURSE = Course(
    id=str(uuid4()),
    name="Presidio",
    par=sum(PARS),
    holes=[Hole(number=i + 1, par=p) for i, p in enumerate(PARS)],
    tees=[Tee(color="Blue", course_rating=72.4, slope_rating=130, hole_yardages={})],
)
START = datetime(2026, 1, 1)


def _round(over: int, day: int) -> Round:
    """A full round `over` par (0–54), the extra strokes spread across the holes."""
    base, extra = divmod(over, 18)
    return Round(
        id=str(uuid4()),
        course=COURSE,
        tee_box="Blue",
        date=START + timedelta(days=day),
        hole_scores=[
            HoleScore(hole_number=i + 1, strokes=PARS[i] + base + (1 if i < extra else 0), putts=2)
            for i in range(18)
        ],
    )


def _rounds(overs: list[int]) -> list[Round]:
    return [_round(over, day) for day, over in enumerate(overs)]


def _differential(over: int) -> float:
    return (72 + over - 72.4) * 113 / 130


round_sets = st.lists(st.integers(min_value=0, max_value=54), min_size=3, max_size=30)


@settings(deadline=None)
@given(round_sets)
def test_index_sits_between_the_best_differential_and_the_average(overs):
    window = overs[-WHS_ROUNDS:]
    diffs = [_differential(o) for o in window]
    _, adjustment = whs_window(len(window))
    index = handicap_index(_rounds(overs))
    assert index is not None
    # Rounded to a tenth, so allow 0.05 either way.
    assert index <= sum(diffs) / len(diffs) + 0.05
    assert index >= min(diffs) + adjustment - 0.05
    assert index <= 54.0


@settings(deadline=None)
@given(round_sets, st.data())
def test_a_better_round_never_raises_the_index(overs, data):
    i = data.draw(st.integers(min_value=0, max_value=len(overs) - 1))
    better = data.draw(st.integers(min_value=0, max_value=overs[i]))
    improved = [*overs[:i], better, *overs[i + 1:]]
    assert handicap_index(_rounds(improved)) <= handicap_index(_rounds(overs))


@settings(deadline=None)
@given(round_sets, st.randoms(use_true_random=False))
def test_the_order_of_the_window_does_not_change_the_index(overs, rng):
    window = overs[-WHS_ROUNDS:]
    shuffled = list(window)
    rng.shuffle(shuffled)
    assert handicap_index(_rounds(shuffled)) == handicap_index(_rounds(window))


@settings(deadline=None, max_examples=50)
@given(
    st.lists(st.integers(min_value=0, max_value=54), min_size=1, max_size=30),
    st.one_of(st.none(), indexes),
    st.one_of(st.none(), st.integers(min_value=0, max_value=30)),
)
def test_the_trend_ends_on_the_index_every_screen_shows(overs, seed, seed_day):
    """CLAUDE.md: the last point of the handicap trend is the golfer's current index."""
    user = User(
        id=str(uuid4()),
        handicap=seed,
        last_handicap_update=None if seed is None or seed_day is None else START + timedelta(days=seed_day),
    )
    history = _rounds(overs)
    trend = player_handicap_trend(user, history)
    assert trend[-1]["handicap_index"] == player_handicap_index(user, history)
