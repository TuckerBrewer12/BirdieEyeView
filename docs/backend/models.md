# Models: golf data and domain rules

`models/` represents users, rounds, hole scores, courses, and tees using Pydantic. These objects describe valid golf data and calculate domain results without HTTP requests, SQL, or provider calls.

## Important files

| File | Responsibility |
|---|---|
| [base.py](../../models/base.py) | Shared validation and safe field updates. |
| [user.py](../../models/user.py) | Player profile, handicap seed, and scoring goals. |
| [round.py](../../models/round.py) | Round coverage, hole scores, resolved summaries, par, and tee context. |
| [hole_score.py](../../models/hole_score.py) | One hole's observed scores and statistics. |
| [course.py](../../models/course.py), [hole.py](../../models/hole.py) | Course layout and per-hole metadata. |
| [tee.py](../../models/tee.py), [user_tee.py](../../models/user_tee.py) | Tee yardages, rating coverage, and user tee configuration. |
| `hole_layout.py`, `scoring.py` (local model-refactor files) | Shared coverage/yardage rules and exact score classification. |

## How objects connect

A User can contain Rounds. A Round contains HoleScores and may reference a Course and selected tee. A Course contains Holes and Tees. Historical `par_played` and course-name snapshots let a round retain played context independently of later course edits or a missing course link.

## Local refactor contracts

The current model working tree uses explicit course layout, intended round holes, and played state. Unique identified holes determine completeness; an unread score is distinct from an intentionally unplayed hole. Missing optional observations stay unknown rather than becoming zero. Accepted historical par takes precedence over current course par.

Use resolved getters and validated correction methods such as `update_fields()`, `Round.update_hole_score()`, and tee yardage updates. Do not assume direct nested container mutations preserve validation or stored-summary freshness. Yardage mappings reject ordinary in-place edits.

These contracts are implemented locally in the separate Models refactor working tree; the added helper files and changes are not included on this documentation-only branch. Persistence, requests, scan assembly, and analytics still require integration. Structural readiness is not provider verification or a completed save gate. Coordinate any model contract change with its API, persistence, service, and analytics consumers.

## Changing this domain

Put intrinsic entity validation and reusable golf rules here. Keep ownership checks that require a caller/database in the API/workflow layers. Verify missing values, exact boundaries, rejected updates leaving prior state intact, and serialization with [test_models.py](../../tests/test_models.py).
