import pytest
from datetime import datetime
from pydantic import ValidationError

from models import Course, Hole, Tee, HoleScore, Round, User, UserTee
from models.hole_layout import FRONT_NINE, BACK_NINE, FULL_ROUND
from models.tee import TeeRating


# ================================================================
# Hole
# ================================================================

def test_hole_validation():
    h = Hole(number=1, par=4, handicap=18)
    assert h.number == 1
    assert h.par == 4

    with pytest.raises(ValidationError):
        Hole(number=1, par=7)          # par > 6

    with pytest.raises(ValidationError):
        Hole(number=1, handicap=19)    # handicap > 18


# ================================================================
# Tee
# ================================================================

def test_tee_validation_and_calculations():
    tee = Tee(
        color="Blue",
        slope_rating=115,
        course_rating=70.0,
        hole_yardages={1: 400, 2: 350}
    )
    assert tee.get_total_yardage() is None  # A partial map is not a course total.
    assert tee.get_hole_yardage(1) == 400
    assert tee.get_hole_yardage(3) is None

    with pytest.raises(ValidationError):
        Tee(hole_yardages={19: 400})   # hole > 18

    with pytest.raises(ValidationError):
        Tee(hole_yardages={1: -50})    # negative yardage

    with pytest.raises(ValidationError):
        Tee(hole_yardages={1: 1001})


def test_tee_empty_yardages():
    tee = Tee(color="Red")
    assert tee.get_total_yardage() is None   # returns None, not 0, when no yardages
    assert tee.get_hole_yardage(1) is None


# ================================================================
# Course
# ================================================================

def test_course_par_calculations():
    holes = [Hole(number=i, par=4, handicap=i) for i in range(1, 19)]
    course = Course(name="Test Course", holes=holes)

    assert course.calculated_par == 72
    assert course.front_nine_par == 36
    assert course.back_nine_par == 36
    assert course.get_par() == 72

    # Missing par on a hole makes calculated_par None
    holes[0].par = None
    assert course.calculated_par is None
    assert course.front_nine_par is None

    # Supplied totals do not conceal incomplete child observations.
    course.par = 71
    assert course.get_par() is None
    holes[0].par = 4
    assert course.get_par() == 72


def test_course_lookups():
    holes = [Hole(number=1, par=4)]
    tees = [Tee(color="White"), Tee(color="Blue")]
    course = Course(holes=holes, tees=tees)

    assert course.get_hole(1).par == 4
    assert course.get_hole(2) is None

    assert course.get_tee("blue").color == "Blue"  # case-insensitive
    assert course.get_tee("Red") is None


# ================================================================
# HoleScore
# ================================================================

def test_hole_score_validation_and_logic():
    with pytest.raises(ValidationError):
        HoleScore(strokes=4, putts=5)  # putts > strokes

    hs = HoleScore(hole_number=1, strokes=5, putts=2, par_played=4)
    assert hs.to_par() == 1
    assert hs.get_score_type() == "bogey"

    # Explicit par arg overrides par_played
    assert hs.to_par(par=5) == 0
    assert hs.get_score_type(par=5) == "par"

    # Common score types via par_played
    assert HoleScore(strokes=3, par_played=5).get_score_type() == "eagle"
    assert HoleScore(strokes=3, par_played=4).get_score_type() == "birdie"
    assert HoleScore(strokes=6, par_played=4).get_score_type() == "double bogey"
    assert HoleScore(strokes=7, par_played=4).get_score_type() == "triple bogey"

    # None strokes → always None
    assert HoleScore(strokes=None, par_played=4).to_par() is None
    assert HoleScore(strokes=None, par_played=None).get_score_type() is None


def test_hole_score_par_played_validation():
    # Boundary values
    assert HoleScore(strokes=3, par_played=3).par_played == 3
    assert HoleScore(strokes=6, par_played=6).par_played == 6

    with pytest.raises(ValidationError):
        HoleScore(strokes=3, par_played=2)   # par < 3

    with pytest.raises(ValidationError):
        HoleScore(strokes=3, par_played=7)   # par > 6

    with pytest.raises(ValidationError):
        HoleScore(strokes=3, handicap_played=0)   # handicap < 1

    with pytest.raises(ValidationError):
        HoleScore(strokes=3, handicap_played=19)  # handicap > 18


def test_hole_score_to_par_no_par_data():
    """to_par and get_score_type return None when neither par arg nor par_played is set."""
    hs = HoleScore(strokes=5)  # no par_played
    assert hs.to_par() is None
    assert hs.get_score_type() is None


def test_score_type_extremes():
    # Albatross is exactly -3; rarer results retain their own labels.
    assert HoleScore(strokes=2, par_played=5).get_score_type() == "albatross"
    assert HoleScore(strokes=3, par_played=6).get_score_type() == "albatross"

    assert HoleScore(strokes=1, par_played=5).get_score_type() == "condor"
    assert HoleScore(strokes=1, par_played=6).get_score_type() == "5 under"
    assert HoleScore(strokes=9, par_played=4).get_score_type() == "5 over"
    assert HoleScore(strokes=10, par_played=4).get_score_type() == "6 over"


def test_atomic_score_updates():
    score = HoleScore(strokes=5, putts=4, shots_to_green=3)
    original = score.model_dump(exclude_unset=True)
    fields = score.model_fields_set.copy()
    revision = score._revision
    with pytest.raises(ValidationError):
        score.strokes = 3
    assert score.model_dump(exclude_unset=True) == original
    assert score.model_fields_set == fields
    assert score._revision == revision
    assert score.update_field('strokes', 3) is not None
    assert score.strokes == 5
    assert score.update_fields(strokes=2, putts=1, shots_to_green=1) is None
    assert (score.strokes, score.putts, score.shots_to_green) == (2, 1, 1)
    assert score.update_field('nonexistent', 1) is not None


@pytest.mark.parametrize('par', [2, 7, 4.5, True, '4'])
def test_explicit_par_validation(par):
    with pytest.raises(ValidationError):
        HoleScore().to_par(par)


def test_score_consistency_and_net_context():
    with pytest.raises(ValidationError):
        HoleScore(strokes=2, shots_to_green=3)
    with pytest.raises(ValidationError):
        HoleScore(strokes=4, played=False)
    assert HoleScore(played=False).strokes is None
    assert HoleScore(played=True).strokes is None
    score = HoleScore(strokes=4, putts=2, shots_to_green=3, net_score=-20)
    assert score.calculate_net_score(2) == 2
    assert score.calculate_net_score(-1) == 5
    assert score.calculate_net_score() is None
    assert HoleScore().calculate_net_score(1) is None
    with pytest.raises(ValidationError):
        score.calculate_net_score(1.5)
    with pytest.raises(ValidationError):
        HoleScore(net_score=2**31)


# ================================================================
# Round
# ================================================================

def test_round_property_aggregations():
    scores = [
        HoleScore(hole_number=1, strokes=4, putts=2, green_in_regulation=True,  par_played=4),
        HoleScore(hole_number=2, strokes=5, putts=1, green_in_regulation=False, par_played=4),
    ]
    r = Round(hole_scores=scores)
    assert r.calculate_total_score() == 9
    assert r.get_total_putts() == 3
    assert r.get_total_gir() == 1
    assert not r.is_complete()


def test_round_nine_hole_calculations():
    # 9-hole round
    scores = [HoleScore(hole_number=i, strokes=4) for i in range(1, 10)]
    r = Round(hole_scores=scores, intended_holes=FRONT_NINE)

    assert r.calculate_front_nine() == 36
    assert r.calculate_back_nine() is None
    assert r.is_complete()

    # 18-hole round
    scores_18 = [HoleScore(hole_number=i, strokes=i % 2 + 4) for i in range(1, 19)]
    r18 = Round(hole_scores=scores_18)
    assert r18.calculate_front_nine() == sum(i % 2 + 4 for i in range(1, 10))
    assert r18.calculate_back_nine() == sum(i % 2 + 4 for i in range(10, 19))
    assert r18.is_complete()


def test_round_to_par_with_course():
    holes = [Hole(number=i, par=4) for i in range(1, 19)]
    course = Course(holes=holes)
    scores = [HoleScore(hole_number=i, strokes=5) for i in range(1, 19)]  # +1 each

    r = Round(course=course, hole_scores=scores)
    assert r.get_hole_par(1) == 4
    assert r.get_par() == 72
    assert r.score_to_par(1) == 1
    assert r.total_to_par() == 18


def test_round_to_par_without_course_fallback():
    """par_played on hole scores is used when no course is attached."""
    scores = [HoleScore(hole_number=i, strokes=5, par_played=4) for i in range(1, 19)]

    r = Round(hole_scores=scores)  # no course
    assert r.get_hole_par(1) == 4
    assert r.get_par() == 72
    assert r.score_to_par(1) == 1
    assert r.total_to_par() == 18


def test_round_total_to_par_no_par_data():
    """total_to_par returns None when no course and no par_played on scores."""
    scores = [HoleScore(hole_number=i, strokes=5) for i in range(1, 19)]
    r = Round(hole_scores=scores)
    assert r.get_par() is None
    assert r.total_to_par() is None


def test_round_score_to_par_no_par_data():
    """score_to_par returns None for a specific hole when no par data available."""
    r = Round(hole_scores=[HoleScore(hole_number=1, strokes=5)])
    assert r.score_to_par(1) is None  # no par source → None


def test_round_gets_correct_tee():
    course = Course(tees=[Tee(color="White")])
    r = Round(course=course, tee_box="white")
    assert r.get_tee() is not None
    assert r.get_tee().color == "White"


def test_round_get_tee_returns_none_without_course():
    r = Round(tee_box="White")  # no course attached
    assert r.get_tee() is None


def test_round_get_hole_score_out_of_range():
    r = Round(hole_scores=[HoleScore(hole_number=1, strokes=4)])
    assert r.get_hole_score(0) is None   # below range
    assert r.get_hole_score(2) is None   # beyond available scores


# ================================================================
# UserTee
# ================================================================

def test_user_tee_validation():
    ut = UserTee(user_id="user1", name="Custom Tee", slope_rating=120, course_rating=72.0)
    assert ut.slope_rating == 120

    with pytest.raises(ValidationError):
        UserTee(user_id="user1", name="t", slope_rating=50)   # slope < 55

    with pytest.raises(ValidationError):
        UserTee(user_id="user1", name="t", slope_rating=156)  # slope > 155

    with pytest.raises(ValidationError):
        UserTee(user_id="user1", name="t", course_rating=0)


@pytest.fixture(params=[Tee, UserTee])
def tee_factory(request):
    def create(**values):
        if request.param is UserTee:
            values.update(user_id='user1', name='Custom')
        return request.param(**values)
    return create


@pytest.mark.parametrize('yardages', [
    {0: 400}, {19: 400}, {True: 400}, {1.0: 400}, {'1.0': 400},
    {1: -1}, {1: 1001}, {1: None}, {1: 400.5}, {1: True},
    {1: 400, '1': 401}, {'1': 400, '01': 401},
])
def test_shared_yardage_rejections(tee_factory, yardages):
    with pytest.raises(ValidationError):
        tee_factory(hole_yardages=yardages)


def test_yardages_are_validated_readonly_and_serializable(tee_factory):
    source = {'1': 0, '2': 1000}
    tee = tee_factory(hole_yardages=source)
    source['1'] = 500
    assert tee.hole_yardages == {1: 0, 2: 1000}
    with pytest.raises(TypeError):
        tee.hole_yardages[1] = 1500
    with pytest.raises(TypeError):
        tee.hole_yardages.update({19: -1})
    with pytest.raises(TypeError):
        tee.hole_yardages.pop(1)
    assert tee.update_yardages({19: 1}) is not None
    assert tee.hole_yardages == {1: 0, 2: 1000}
    assert tee.update_yardages({1: 800}) is None
    restored = type(tee).model_validate_json(tee.model_dump_json())
    assert restored.hole_yardages == {1: 800}
    assert tee.model_dump()['hole_yardages'] == {1: 800}
    assert tee_factory().hole_yardages == {}


def test_yardage_coverage_and_summary_freshness(tee_factory):
    tee = tee_factory(total_yardage=3000, yardage_holes=FRONT_NINE)
    assert tee.get_total_yardage() == 3000
    assert tee.get_total_yardage(BACK_NINE) is None
    assert tee.update_yardages({1: 400}) is None
    assert tee.get_total_yardage() is None
    assert tee.update_yardages({}) is None
    assert tee.get_total_yardage() is None  # Old summary cannot reappear.
    tee.total_yardage = 3100
    assert tee.get_total_yardage() == 3100
    tee.update_yardages({n: 300 for n in FRONT_NINE})
    assert tee.get_total_yardage() == 2700
    assert tee_factory(hole_yardages={n: 300 for n in FRONT_NINE}).get_total_yardage() is None
    full = tee_factory(hole_yardages={n: 300 for n in FULL_ROUND})
    assert full.get_total_yardage() == 5400
    assert full.get_total_yardage(BACK_NINE) == 2700
    with pytest.raises(ValidationError):
        tee_factory(total_yardage=9001, yardage_holes=FRONT_NINE)


@pytest.mark.parametrize('rating', [0, -1, float('inf'), float('-inf'), float('nan')])
def test_course_ratings_must_be_positive_finite(tee_factory, rating):
    with pytest.raises(ValidationError):
        tee_factory(course_rating=rating)
    with pytest.raises(ValidationError):
        TeeRating(hole_numbers=FRONT_NINE, course_rating=rating)


def test_explicit_rating_coverage(tee_factory):
    tee = tee_factory(course_rating=26.3, slope_rating=80)
    assert tee.get_rating(FRONT_NINE) is None
    tee.rating_holes = FRONT_NINE
    assert tee.get_rating(FRONT_NINE).course_rating == 26.3
    assert tee.get_rating(FULL_ROUND) is None
    tee.ratings = [TeeRating(hole_numbers=BACK_NINE, course_rating=27.1, slope_rating=85)]
    assert tee.get_rating(BACK_NINE).course_rating == 27.1
    assert tee.get_rating(FRONT_NINE).course_rating == 26.3
    assert tee_factory(course_rating=49.4, rating_holes=FULL_ROUND).get_rating(FRONT_NINE) is None


@pytest.mark.parametrize('coverage', [FRONT_NINE, BACK_NINE, FULL_ROUND])
def test_explicit_round_formats(coverage):
    scores = [HoleScore(hole_number=n, strokes=4, par_played=4) for n in coverage]
    round_ = Round(hole_scores=scores, intended_holes=coverage)
    assert round_.is_complete()
    assert round_.get_par() == 4 * len(coverage)
    assert round_.calculate_total_score() == 4 * len(coverage)
    assert round_.total_to_par() == 0
    assert round_.calculate_net_score(3) == 4 * len(coverage) - 3
    assert round_.calculate_net_score() is None
    assert Round.model_validate_json(round_.model_dump_json()).is_complete()
    round_.hole_scores[0].strokes = None
    assert not round_.is_complete()
    assert round_.calculate_net_score(3) is None
    assert round_.total_to_par() == 0


@pytest.mark.parametrize('coverage', [[], [1, 2], list(FRONT_NINE) + [1], range(1, 10), [str(n) for n in FRONT_NINE]])
def test_invalid_hole_coverage(coverage):
    with pytest.raises(ValidationError):
        Round(intended_holes=coverage)
    with pytest.raises(ValidationError):
        TeeRating(hole_numbers=coverage)


def test_unknown_nine_is_not_inferred_from_count():
    scores = [HoleScore(hole_number=n, strokes=4) for n in FRONT_NINE]
    assert not Round(hole_scores=scores).is_complete()
    assert not Round(course=Course(total_holes=18), hole_scores=scores).is_complete()
    assert Round(course=Course(total_holes=9), hole_scores=scores).is_complete()
    assert Course(holes=[Hole(number=n, par=4) for n in FRONT_NINE]).calculated_par is None
    nine = Course(total_holes=9, holes=[Hole(number=n, par=4) for n in FRONT_NINE])
    assert nine.calculated_par == 36
    assert nine.front_nine_par == 36
    assert nine.back_nine_par is None


def test_duplicate_and_unnumbered_scores_are_not_double_counted():
    scores = [HoleScore(hole_number=n, strokes=4, par_played=4) for n in FRONT_NINE]
    round_ = Round(intended_holes=FRONT_NINE, hole_scores=scores + [scores[0]])
    assert not round_.is_complete()
    assert round_.get_hole_score(1) is None
    assert round_.get_hole_par(1) is None
    assert round_.calculate_total_score() is None
    assert round_.get_par() is None
    assert round_.total_to_par() is None
    assert round_.update_hole_score(1, strokes=5) is not None
    round_.hole_scores = scores + [HoleScore(strokes=10, putts=5)]
    assert round_.calculate_total_score() == 36
    assert round_.total_to_par() == 0
    assert not round_.is_complete()
    assert len(round_.hole_scores) == 10  # Unidentified data stays available for review.
    round_.hole_scores = scores + [HoleScore(hole_number=10, strokes=4)]
    assert round_.calculate_total_score() is None
    assert not round_.is_complete()


def test_partial_to_par_and_historical_authority():
    course = Course(total_holes=18, holes=[Hole(number=n, par=4) for n in FULL_ROUND])
    score = HoleScore(hole_number=1, strokes=5, par_played=3)
    round_ = Round(course=course, hole_scores=[score])
    assert round_.calculate_total_score() == 5
    assert round_.total_to_par() == 2
    assert round_.get_par() == 71
    course.holes[0].par = 5
    assert round_.get_hole_par(1) == 3
    assert round_.total_to_par() == 2
    score.par_played = None
    assert round_.total_to_par() == 0
    course.holes[0].par = None
    assert round_.get_hole_par(1) is None
    assert round_.get_par() is None
    assert round_.total_to_par() is None
    score.par_played = 4
    assert round_.total_to_par() == 1


def test_unplayed_is_not_the_same_as_unread():
    round_ = Round(intended_holes=FRONT_NINE, hole_scores=[
        HoleScore(hole_number=1, played=False),
        HoleScore(hole_number=2, played=True),
        HoleScore(hole_number=3),
    ])
    assert round_.calculate_total_score() is None
    assert not round_.is_complete()
    assert [s.played for s in round_.hole_scores] == [False, True, None]


def test_statistics_require_every_scored_observation():
    round_ = Round(total_putts=30, total_gir=10, hole_scores=[
        HoleScore(hole_number=1, strokes=4, putts=0, green_in_regulation=False),
        HoleScore(hole_number=2, strokes=5),
        HoleScore(hole_number=3, green_in_regulation=True, putts=2),
    ])
    assert round_.get_total_putts() is None
    assert round_.get_total_gir() is None
    round_.hole_scores[1].update_fields(putts=0, green_in_regulation=False)
    assert round_.get_total_putts() == 0
    assert round_.get_total_gir() == 0


def test_summary_sources_and_nested_edits():
    round_ = Round(total_putts=30, total_gir=10, hole_scores=[HoleScore(hole_number=1, strokes=4)])
    assert round_.get_total_putts() == 30
    assert round_.get_total_gir() == 10
    round_.notes = 'Unrelated correction'
    assert round_.get_total_putts() == 30
    assert round_.update_hole_score(1, putts=5) is not None
    assert round_.get_total_putts() == 30
    assert round_.update_hole_score(1, putts=2) is None
    assert round_.get_total_putts() == 2
    assert round_.get_total_gir() == 10  # Unrelated summary is preserved.
    round_.hole_scores[0].putts = None
    assert round_.get_total_putts() is None
    round_.total_putts = 31
    assert round_.get_total_putts() == 31
    # Even without an intervening read, adding and clearing a value invalidates its old source.
    round_.hole_scores[0].putts = 1
    round_.hole_scores[0].putts = None
    assert round_.get_total_putts() is None
    round_.hole_scores = []
    assert round_.get_total_putts() is None


@pytest.mark.parametrize('field, invalid', [('total_putts', -1), ('total_gir', -1), ('total_putts', 91), ('total_gir', 10)])
def test_nine_hole_summary_bounds(field, invalid):
    with pytest.raises(ValidationError):
        Round(intended_holes=FRONT_NINE, **{field: invalid})
    round_ = Round(**{field: invalid}) if invalid >= 0 else Round()
    before = round_.model_dump(exclude_unset=True)
    if invalid >= 0:
        assert round_.update_field('intended_holes', FRONT_NINE) is not None
        assert round_.model_dump(exclude_unset=True) == before


def test_course_duplicates_summary_and_save_readiness():
    holes = [Hole(number=n, par=4) for n in FRONT_NINE]
    course = Course(name='Nine', total_holes=9, holes=holes)
    assert not course.has_required_course_data()
    course.tees = [Tee(color='White', hole_yardages={n: 300 for n in FRONT_NINE}), Tee(color='Red')]
    assert course.has_required_course_data()
    assert course.has_required_course_data('white')
    assert not course.has_required_course_data('Red')
    assert not course.has_required_course_data('Blue')
    assert course.tees[0].course_rating is None  # Ratings are optional for basic saving.
    course.holes = holes[:-1] + [holes[0]]
    assert course.get_hole(1) is None
    assert course.front_nine_par is None
    assert course.get_par() is None
    assert not course.has_required_course_data()
    summary = Course(total_holes=9, par=36)
    assert summary.get_par() == 36
    summary.holes = [Hole(number=1, par=4)]
    assert summary.get_par() is None
    summary.holes = []
    assert summary.get_par() is None
    with pytest.raises(ValidationError):
        Course(total_holes=9, par=55)
    assert Course(total_holes=18, par=108).get_par() == 108
    legacy_summary = Course(par=72)
    assert legacy_summary.get_par() == 72
    assert legacy_summary.get_expected_holes() is None
    assert not legacy_summary.has_required_course_data()


def test_no_guessed_tee_and_legacy_course_precedence():
    course = Course(tees=[Tee(color='White')])
    custom = UserTee(user_id='user1', name='White')
    assert Round(course=course).get_tee() is None
    assert Round(course=course, tee_box='White', user_tee=custom).get_tee() is course.tees[0]
    assert Round(user_tee=custom).get_tee() is custom
    course.tees.append(Tee(color='white'))
    assert course.get_tee('White') is None


@pytest.mark.parametrize('field, low, high', [('scoring_goal', 18, 270), ('scoring_goal_nine', 9, 135)])
def test_goal_formats_and_bounds(field, low, high):
    assert getattr(User(), field) is None
    for value in (low, high):
        assert getattr(User(**{field: value}), field) == value
    for value in (low - 1, high + 1, 20.5, True):
        with pytest.raises(ValidationError):
            User(**{field: value})
    user = User(scoring_goal=89, scoring_goal_nine=44)
    assert user.update_field(field, high + 1) is not None
    assert (user.scoring_goal, user.scoring_goal_nine) == (89, 44)


def test_serialization_does_not_resurrect_invalidated_summaries():
    round_ = Round(total_putts=30, total_gir=10, hole_scores=[HoleScore(hole_number=1, strokes=4)])
    round_.hole_scores[0].update_fields(putts=2, green_in_regulation=False)
    assert round_.model_dump()['total_putts'] == 2
    assert round_.model_dump()['total_gir'] == 0
    round_.hole_scores[0].update_fields(putts=None, green_in_regulation=None)
    restored = Round.model_validate_json(round_.model_dump_json())
    assert restored.get_total_putts() is None
    assert restored.get_total_gir() is None
    tee = Tee(total_yardage=3000, yardage_holes=FRONT_NINE)
    tee.update_yardages({1: 400})
    tee.update_yardages({})
    assert Tee.model_validate_json(tee.model_dump_json()).get_total_yardage() is None
    course = Course(total_holes=9, par=36)
    course.holes = [Hole(number=1, par=4)]
    course.holes = []
    assert Course.model_validate_json(course.model_dump_json()).get_par() is None


@pytest.mark.parametrize('method', ['clear', 'popitem', 'setdefault', '__delitem__', '__ior__'])
def test_other_inplace_yardage_mutations_are_rejected(method):
    tee = Tee(hole_yardages={1: 400})
    arguments = {'setdefault': (2, 300), '__delitem__': (1,), '__ior__': ({2: 300},)}
    with pytest.raises(TypeError):
        getattr(tee.hole_yardages, method)(*arguments.get(method, ()))
    assert tee.hole_yardages == {1: 400}


def test_rejected_nested_replacement_preserves_state_and_summary_sources():
    round_ = Round(total_putts=30, hole_scores=[HoleScore(hole_number=1, strokes=4)])
    original_child = round_.hole_scores[0]
    original_sources = round_._summary_sources.copy()
    fields = round_.model_fields_set.copy()
    with pytest.raises(ValidationError):
        round_.hole_scores = [{'hole_number': 1, 'strokes': 2, 'putts': 3}]
    assert round_.hole_scores[0] is original_child
    assert round_._summary_sources == original_sources
    assert round_.model_fields_set == fields
    assert round_.get_total_putts() == 30
    assert round_.update_hole_score(1, strokes=2, putts=1) is None
    assert round_.hole_scores[0].strokes == 2
    assert round_.get_total_putts() == 1


def test_mutable_defaults_and_readonly_map_copies_are_isolated():
    first, second = Round(), Round()
    first.hole_scores.append(HoleScore(hole_number=1, strokes=4))
    assert second.hole_scores == []
    tee = Tee(hole_yardages={1: 400})
    editable = tee.hole_yardages.copy()
    editable[1] = 500
    assert tee.hole_yardages[1] == 400
    assert tee.model_copy(deep=True).get_hole_yardage(1) == 400


def test_canonical_full_round_ignores_unread_unnumbered_placeholder():
    round_ = Round(hole_scores=[HoleScore(hole_number=n, strokes=4) for n in FULL_ROUND] + [HoleScore()])
    assert round_.is_complete()
    assert round_.calculate_total_score() == 72


@pytest.mark.parametrize('par', [3, 6])
@pytest.mark.parametrize('count', [9, 18])
def test_course_par_bounds_follow_hole_bounds(count, par):
    course = Course(total_holes=count, holes=[Hole(number=n, par=par) for n in range(1, count + 1)])
    assert course.get_par() == count * par


def test_required_course_data_cannot_use_ambiguous_or_unnamed_tees():
    course = Course(name='Nine', total_holes=9, holes=[Hole(number=n, par=4) for n in FRONT_NINE])
    yards = {n: 0 for n in FRONT_NINE}
    course.tees = [Tee(hole_yardages=yards)]
    assert not course.has_required_course_data()
    course.tees = [Tee(color='White', hole_yardages=yards), Tee(color='white', hole_yardages=yards)]
    assert not course.has_required_course_data()
    course.tees = [Tee(color='White', hole_yardages=yards)]
    assert course.has_required_course_data()
    course.tees[0].update_yardages({n: 300 for n in FRONT_NINE if n != 9})
    assert not course.has_required_course_data()


def test_serialization_exclusions_remain_respected():
    round_ = Round(hole_scores=[HoleScore(hole_number=1, strokes=4, putts=2)])
    assert 'total_putts' not in round_.model_dump(exclude_unset=True)
    assert 'total_putts' not in round_.model_dump(exclude={'total_putts'})
    assert 'total_yardage' not in Tee().model_dump(exclude_unset=True)
    assert 'par' not in Course().model_dump(exclude_unset=True)


def test_ambiguous_rating_records_do_not_choose_a_winner(tee_factory):
    tee = tee_factory(ratings=[
        TeeRating(hole_numbers=FRONT_NINE, course_rating=26.3),
        TeeRating(hole_numbers=FRONT_NINE, course_rating=27.1),
    ])
    assert tee.get_rating(FRONT_NINE) is None


def _nine_hole_course():
    return Course(name="Nine", total_holes=9, holes=[Hole(number=n, par=4) for n in FRONT_NINE])


def test_intended_holes_must_fit_the_linked_course_layout():
    scores = [HoleScore(hole_number=n, strokes=5) for n in BACK_NINE]
    with pytest.raises(ValidationError, match="outside the linked course layout"):
        Round(course=_nine_hole_course(), intended_holes=BACK_NINE, hole_scores=scores)

    round_ = Round(course=_nine_hole_course(), intended_holes=FRONT_NINE)
    assert round_.update_field("intended_holes", BACK_NINE) is not None
    assert round_.intended_holes == FRONT_NINE

    eighteen = Course(name="Full", total_holes=18)
    assert Round(course=eighteen, intended_holes=BACK_NINE).intended_holes == BACK_NINE
    assert Round(course=Course(name="Unknown"), intended_holes=BACK_NINE).intended_holes == BACK_NINE


def test_ambiguous_course_tee_does_not_fall_back_to_user_tee():
    custom = UserTee(user_id="u", name="Mine")
    ambiguous = Course(name="T", tees=[Tee(color="Blue"), Tee(color="blue")])
    assert Round(course=ambiguous, tee_box="Blue", user_tee=custom).get_tee() is None

    unmatched = Course(name="T", tees=[Tee(color="White")])
    assert Round(course=unmatched, tee_box="Blue", user_tee=custom).get_tee() is custom

    blue = Tee(color="Blue")
    single = Course(name="T", tees=[blue, Tee(color="White")])
    assert Round(course=single, tee_box="blue", user_tee=custom).get_tee() is blue


@pytest.mark.parametrize("model, field, value", [
    (HoleScore, "strokes", True),
    (HoleScore, "strokes", "5"),
    (HoleScore, "strokes", 5.0),
    (HoleScore, "putts", False),
    (HoleScore, "hole_number", "1"),
    (HoleScore, "par_played", 4.0),
    (HoleScore, "handicap_played", True),
    (HoleScore, "shots_to_green", "3"),
    (Hole, "par", "4"),
    (Hole, "number", True),
    (Hole, "handicap", 1.0),
    (User, "handicap", "12.4"),
    (User, "handicap", True),
    (Tee, "course_rating", True),
    (Tee, "slope_rating", "113"),
])
def test_numeric_fields_reject_coerced_values(model, field, value):
    with pytest.raises(ValidationError):
        model(**{field: value})


def test_strict_floats_still_accept_integers():
    assert Tee(course_rating=72, slope_rating=113).slope_rating == 113.0
    assert User(handicap=12).handicap == 12.0


def test_tees_with_yardages_can_be_copied_and_pickled():
    import copy
    import pickle

    tee = Tee(color="Blue", hole_yardages={1: 400, 2: 150})
    copied = copy.copy(tee.hole_yardages)
    assert copied == {1: 400, 2: 150}
    with pytest.raises(TypeError):
        copied[1] = 500

    restored = pickle.loads(pickle.dumps(tee))
    assert restored.hole_yardages == {1: 400, 2: 150}
    with pytest.raises(TypeError):
        restored.hole_yardages[1] = 500


@pytest.mark.parametrize("build, attribute, item", [
    (lambda: Round(), "hole_scores", HoleScore(hole_number=1, strokes=4)),
    (lambda: Course(), "holes", Hole(number=1, par=4)),
    (lambda: Course(), "tees", Tee(color="Blue")),
    (lambda: Tee(), "ratings", TeeRating(hole_numbers=FRONT_NINE, course_rating=35.0)),
    (lambda: User(), "rounds", Round()),
])
def test_review_containers_reject_wrong_element_types(build, attribute, item):
    model = build()
    container = getattr(model, attribute)
    container.append(item)
    container.insert(0, item)
    container.extend([item])
    container[0] = item
    assert len(container) == 3

    for edit in (
        lambda: container.append({"hole_number": 1}),
        lambda: container.insert(0, None),
        lambda: container.extend([item, "bad"]),
        lambda: container.__setitem__(0, 7),
        lambda: container.__setitem__(slice(0, 1), ["bad"]),
        lambda: container.__iadd__(["bad"]),
    ):
        with pytest.raises(TypeError):
            edit()
    assert len(container) == 3


def test_checked_containers_survive_validation_copies_and_updates():
    import pickle

    round_ = Round(hole_scores=[HoleScore(hole_number=1, strokes=4)])
    assert round_.update_field("notes", "windy") is None
    for container in (round_.hole_scores, round_.model_copy(deep=True).hole_scores,
                      pickle.loads(pickle.dumps(round_)).hole_scores,
                      Round.model_validate(round_.model_dump()).hole_scores):
        with pytest.raises(TypeError):
            container.append({"hole_number": 2})
    assert round_.model_dump()["hole_scores"][0]["strokes"] == 4
