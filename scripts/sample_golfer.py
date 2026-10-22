"""Write the sample golfer the landing page's demo tour is captured with.

A season of believable rounds is run through the real stats endpoints, so every
screen in the tour shows the same player with figures the server worked out.

Run from the repo root: python scripts/sample_golfer.py
Output: frontend/src/testing/fixtures/sampleGolfer.ts (generated; do not edit)
"""

import asyncio
import json
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from uuid import NAMESPACE_URL, UUID, uuid5

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.encoders import jsonable_encoder  # noqa: E402

from api.round_responses import round_detail  # noqa: E402
from api.routers import stats  # noqa: E402
from models import Course, Hole, HoleScore, Round, Tee, User  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "testing" / "fixtures" / "sampleGolfer.ts"

# Seeded, so a re-run writes the same golfer and the captures stay put.
rng = random.Random(7)


def _id(name: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"birdieeyeview-sample/{name}"))


def _course(name, location, pars, handicaps, tee_color, rating, slope, yards):
    return Course(
        id=_id(name),
        name=name,
        location=location,
        par=sum(pars),
        holes=[Hole(number=i + 1, par=p, handicap=h) for i, (p, h) in enumerate(zip(pars, handicaps))],
        tees=[Tee(
            color=tee_color,
            course_rating=rating,
            slope_rating=slope,
            hole_yardages={i + 1: y for i, y in enumerate(yards)},
            total_yardage=sum(yards),
        )],
    )


PRESIDIO = _course(
    "Presidio Golf Course", "San Francisco, CA",
    [4, 5, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 3, 4, 4, 5],
    [7, 11, 1, 15, 5, 9, 17, 3, 13, 8, 2, 16, 6, 12, 18, 4, 10, 14],
    "Blue", 70.8, 133,
    [378, 512, 431, 165, 402, 356, 148, 418, 520, 389, 441, 172, 365, 498, 155, 410, 395, 531],
)
HALF_MOON_BAY = _course(
    "Half Moon Bay Golf Links", "Half Moon Bay, CA",
    [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 5, 4, 3, 4, 4, 5, 3, 4],
    [5, 9, 15, 3, 11, 1, 17, 7, 13, 6, 2, 10, 16, 4, 12, 8, 18, 14],
    "White", 71.4, 128,
    [385, 362, 158, 515, 401, 428, 172, 498, 380, 372, 530, 395, 149, 418, 365, 505, 181, 412],
)
SHARP_PARK = _course(
    "Sharp Park Golf Course", "Pacifica, CA",
    [4, 5, 4, 3, 4, 4, 5, 3, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4],
    [9, 3, 13, 17, 1, 11, 5, 15, 7, 10, 18, 4, 2, 12, 16, 8, 6, 14],
    "Blue", 70.6, 122,
    [372, 505, 360, 158, 425, 348, 498, 176, 392, 381, 142, 410, 527, 366, 167, 389, 489, 401],
)

# Home course most weeks, the links now and then.
SCHEDULE = [PRESIDIO, PRESIDIO, SHARP_PARK, PRESIDIO, HALF_MOON_BAY, PRESIDIO, SHARP_PARK, PRESIDIO,
            PRESIDIO, HALF_MOON_BAY, PRESIDIO, SHARP_PARK, PRESIDIO, PRESIDIO, HALF_MOON_BAY, PRESIDIO,
            SHARP_PARK, PRESIDIO, PRESIDIO, HALF_MOON_BAY, PRESIDIO, PRESIDIO, SHARP_PARK, PRESIDIO]

USER = User(
    id=_id("user"),
    name="Sam Rivera",
    email="sam@example.com",
    email_verified=True,
    home_course_id=PRESIDIO.id,
    handicap=None,
    created_at=datetime(2026, 2, 20),
    scoring_goal=79,
)


def _hole(number: int, par: int, skill: float) -> HoleScore:
    """One hole for a mid-teens player; skill falls toward 0 as the season goes on."""
    gir = rng.random() < 0.40 - 0.18 * skill
    to_green = par - 2 if gir else par - 2 + (2 if rng.random() < 0.08 + 0.22 * skill else 1)
    if gir:
        putts = rng.choices([1, 2, 3], [0.14, 0.74, 0.12])[0]
    else:
        putts = rng.choices([1, 2, 3], [0.38, 0.54, 0.08 + 0.06 * skill])[0]
    strokes = max(to_green + putts, 2)
    return HoleScore(
        hole_number=number,
        strokes=strokes,
        putts=putts,
        green_in_regulation=gir,
        fairway_hit=(rng.random() < 0.52) if par > 3 else None,
        par_played=par,
    )


def _season() -> list[Round]:
    start = datetime(2026, 2, 28, 9, 0)
    rounds = []
    for i, course in enumerate(SCHEDULE):
        skill = 1 - i / (len(SCHEDULE) - 1)
        played = start + timedelta(days=4 * i + rng.randint(0, 2))
        rounds.append(Round(
            id=_id(f"round-{i}"),
            course=course,
            tee_box=course.tees[0].color,
            date=played,
            hole_scores=[_hole(h.number, h.par, skill) for h in course.holes],
        ))
    return rounds


class _Repo:
    def __init__(self, **methods):
        for name, fn in methods.items():
            setattr(self, name, fn)


def _database(rounds: list[Round]):
    newest_first = sorted(rounds, key=lambda r: r.date, reverse=True)

    async def get_user(_user_id):
        return USER

    async def get_round_summaries_for_user(_user_id, *, limit=100, offset=0):
        return newest_first[offset:offset + limit]

    async def get_rounds_for_user(_user_id, limit=100, offset=0, course_id=None, date_from=None):
        picked = [
            r for r in newest_first
            if (course_id is None or r.course.id == course_id)
            and (date_from is None or r.date.date() >= date_from)
        ]
        return picked[offset:offset + limit]

    async def are_friends(_a, _b):
        return False

    class Database:
        users = _Repo(get_user=get_user)
        rounds = _Repo(
            get_round_summaries_for_user=get_round_summaries_for_user,
            get_rounds_for_user=get_rounds_for_user,
        )
        friendships = _Repo(are_friends=are_friends)

    return Database()


async def _responses() -> dict:
    rounds = _season()
    db = _database(rounds)
    user_id = UUID(USER.id)

    dashboard = await stats.get_dashboard(user_id, db, USER)
    analytics = await stats.get_analytics(user_id, 50, None, None, db, USER)
    goal_report = await stats.get_goal_report(user_id, 20, db, USER)

    best = min(rounds, key=lambda r: r.calculate_total_score())
    profile = {
        "id": USER.id,
        "name": USER.name,
        "email": USER.email,
        "home_course_id": USER.home_course_id,
        "handicap": dashboard.handicap_index,
        "created_at": USER.created_at,
        "scoring_goal": USER.scoring_goal,
    }
    return jsonable_encoder({
        "user": {"user_id": USER.id, "name": USER.name, "email": USER.email, "email_verified": True},
        "profile": profile,
        "handicapIndex": dashboard.handicap_index,
        "dashboard": dashboard,
        "analytics": analytics,
        "goalReport": goal_report,
        # The tour's pages never ask for the round list; Analytics opens just the best round.
        "detailRounds": [round_detail(best)],
    })


HEADER = """\
// Generated by scripts/sample_golfer.py from a seeded season run through the real stats
// endpoints. Do not edit by hand; re-run the script instead.
import type { FakeBackendSeed } from "../fakes/FakeBackend";

/** The golfer the landing page's demo tour is captured with. */
export const sampleGolfer = """


def _format(value, depth: int = 0) -> str:
    """JSON with each flat object or list on one line, so a hole or a trend point reads as a row."""
    flat = json.dumps(value, sort_keys=True, separators=(", ", ": "))
    if not isinstance(value, (dict, list)) or not any(isinstance(v, (dict, list)) for v in (
        value.values() if isinstance(value, dict) else value
    )):
        return flat
    inner = "  " * (depth + 1)
    if isinstance(value, dict):
        items = [f"{inner}{json.dumps(k)}: {_format(value[k], depth + 1)}" for k in sorted(value)]
        return "{\n" + ",\n".join(items) + "\n" + "  " * depth + "}"
    items = [f"{inner}{_format(v, depth + 1)}" for v in value]
    return "[\n" + ",\n".join(items) + "\n" + "  " * depth + "]"


def main() -> int:
    seed = asyncio.run(_responses())
    body = _format(seed)
    OUT.write_text(HEADER + body + " satisfies FakeBackendSeed;\n")
    print(f"wrote {OUT.relative_to(Path.cwd()) if OUT.is_relative_to(Path.cwd()) else OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
