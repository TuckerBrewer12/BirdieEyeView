"""One good/bad/neutral call for every figure a screen colours."""

from analytics import stats
from analytics.verdicts import change_verdict


def test_change_verdict_reads_a_fall_as_good():
    assert change_verdict(-1.2) == "good"
    assert change_verdict(0.4) == "bad"
    assert change_verdict(0.0) == "neutral"
    assert change_verdict(None) is None
    # A figure that improves as it rises reads the other way.
    assert change_verdict(2.1, lower_is_better=False) == "good"
    assert change_verdict(-0.5, lower_is_better=False) == "bad"


def test_putts_read_against_two_a_hole_to_a_tenth():
    assert stats.putts_verdict(1.6) == "good"
    assert stats.putts_verdict(2.4) == "bad"
    assert stats.putts_verdict(2.04) == "neutral"  # rounds to two
    assert stats.putts_verdict(None) is None
