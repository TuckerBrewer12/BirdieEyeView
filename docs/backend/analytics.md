# Analytics: statistics, handicap, goals, and exports

`analytics/` transforms round models into measurements and summaries. API stats endpoints use those results for Dashboard, Analytics, Career, comparisons, and improvement reports.

## Important files

| File | Responsibility |
|---|---|
| [eligibility.py](../../analytics/eligibility.py) | Which holes, rounds and observations each metric may use; par/handicap resolution; unknown-aware rates. |
| [stats.py](../../analytics/stats.py) | Player/round/hole metrics, trends, distributions, comparisons, and achievements. |
| [handicap.py](../../analytics/handicap.py) | WHS-based index estimate: differentials, rating coverage, course handicap, trend and used rounds. |
| [goals.py](../../analytics/goals.py) | Gap to the 18- and nine-hole scoring goals and ranked improvement estimates (one function per saver). |
| [visualizations.py](../../analytics/visualizations.py) | Matplotlib figure builders for Python exports. |
| [visualize_player_from_db.py](../../analytics/visualize_player_from_db.py) | Database-backed chart export script. |
| [demo.py](../../analytics/demo.py) | Sample data and chart demonstration. |

## How results reach the app

`api/routers/stats.py` loads player history, chooses filters/windows, calls Analytics, and assembles response data. Frontend view-model hooks shape that data for charts. Python Matplotlib exports are a separate path; React charts do not render those generated PNGs. `AIService` also consumes Stats, while frontend Analytics has local narrative-card generation.

## Metric contracts

[eligibility.py](../../analytics/eligibility.py) is the one place these rules live; metrics call it rather than re-deriving them.

- **Which holes count:** a scored hole is numbered, uniquely identified, has strokes and wasn't marked unplayed (the same set `Round` totals use). Par is the par played first, then the linked course hole, so metrics don't need a linked course.
- **Which rounds count:** round results (averages, best and lowest rounds, records, score/putt/GIR breaks, goal status, handicap) use complete rounds only (`Round.is_complete()`). Hole-level metrics (GIR, putts, scrambling, scoring by par/yardage/handicap, distributions, per-hole averages) use every scored hole.
- **Nine-hole rounds:** integrated, never doubled. Hole-level metrics combine nine- and 18-hole rounds; round totals are reported by format (18-hole values plus nine-hole fields alongside). Score trends keep a row per round with a `holes` format and a total only when complete.
- **Unknown is not zero:** a rate with no opportunities is `None` with its counts; unknown GIR is neither a hit nor a miss; unrecorded putts are excluded, not zero.
- **Definitions:** scrambling is par or better after a missed green; up-and-down is a missed green, at most one putt and par or better; overall percentages are total successes ÷ total opportunities; achievements use exact score names ([scoring.py](../../models/scoring.py)) while charts keep grouped buckets (Eagle+, Quad+); hole consistency is ranked only with at least three scores; a selected tee that isn't on the course has unknown yardage.
- **Time and history:** rounds are taken in date order (undated last, mixed timezone awareness handled); the one-year achievement window keeps the time of day and excludes future rounds. Lifetime achievements, milestones and round comparisons use the full history; recent windows keep their limits.

### Handicap

[handicap.py](../../analytics/handicap.py) is a WHS-based **estimate**, not an official index. It uses complete 18-hole rounds with the Course/Slope Rating covering the holes played; a rating saved without coverage covers the course's whole layout, and new saves record that coverage. Differentials are rounded to the tenth with .5 up, and the same values drive selection, the index and the used-round flags (computed from the full calculation, then shown for the displayed rounds). Every caller passes the user's seed/reset and full history via `user_handicap_index`. Not implemented: adjusted gross score, playing conditions, caps, and nine-hole rounds (they need the WHS expected-score method; a front or back nine of an 18-hole course has no rating unless one was recorded).

### Goals

[goals.py](../../analytics/goals.py) judges the 18-hole goal on complete 18-hole rounds and adds a `nine_hole` summary when a nine-hole goal is set. Savers are estimates under named, uncalibrated assumptions; they overlap and are not independent shares of the gap.

### Charts and export

[visualizations.py](../../analytics/visualizations.py) draws unknown values as gaps and says when a summary chart has no data. [visualize_player_from_db.py](../../analytics/visualize_player_from_db.py) writes each run to `<outdir>/<player>/<timestamp>/`, exports a chart only when its metric has data, and closes every figure.

Meaningful tests use real round/hole models and include missing observations, zero values, sparse history, mixed round formats, and exact boundaries: `test_analytics_eligibility.py`, `test_analytics_metrics.py`, `test_analytics.py`, `test_handicap.py`, `test_handicap_contracts.py`, `test_goals.py`, `test_stats_contracts.py`, `test_visualizations.py`.
