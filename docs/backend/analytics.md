# Analytics: statistics, handicap, goals, and exports

`analytics/` transforms round models into measurements and summaries. API stats endpoints use those results for Dashboard, Analytics, Career, comparisons, and improvement reports.

## Important files

| File | Responsibility |
|---|---|
| [stats.py](../../analytics/stats.py) | Player/round/hole metrics, trends, distributions, comparisons, and achievements. |
| [handicap.py](../../analytics/handicap.py) | Differentials, index history, seed context, and used-round annotations. |
| [goals.py](../../analytics/goals.py) | Gap to scoring goal and ranked improvement opportunities. |
| [visualizations.py](../../analytics/visualizations.py) | Matplotlib figure builders for Python exports. |
| [visualize_player_from_db.py](../../analytics/visualize_player_from_db.py) | Database-backed chart export script. |
| [demo.py](../../analytics/demo.py) | Sample data and chart demonstration. |

## How results reach the app

`api/routers/stats.py` loads player history, chooses filters/windows, calls Analytics, and assembles response data. Frontend view-model hooks shape that data for charts. Python Matplotlib exports are a separate path; React charts do not render those generated PNGs. `AIService` also consumes Stats, while frontend Analytics has local narrative-card generation.

## Metric contracts

A percentage needs an explicit observation denominator. Unknown GIR is not a miss; unrecorded putts are not zero. A complete-round average, a partial-hole statistic, and a handicap calculation can require different eligibility rules. Always identify units, intended hole format, history scope, and weighting before reusing a metric. Estimated stroke savings require stated assumptions rather than only a plausible constant.

These are integration requirements, not claims that current calculations satisfy them. The five core files were reviewed and have documented issues; demo/package exports were intentionally skipped. See the [Analytics review](<../../1. Fix backend consistency issues - Analytics.md>) for reproductions and open decisions. Handicap output should not be described as a complete official rules implementation based only on its name.

Meaningful tests use real round/hole models and include missing observations, zero values, sparse history, mixed round formats, and exact boundaries. Existing suites include `test_analytics.py`, `test_handicap.py`, and `test_goals.py`.
