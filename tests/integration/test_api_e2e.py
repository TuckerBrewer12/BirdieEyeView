import asyncio
import copy
import dataclasses
import io
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlparse

import asyncpg
import pytest
from fastapi.testclient import TestClient
from jose import jwt
from PIL import Image

import api.main as api_main
from api import auth_utils
from api import scan_uploads
from api.routers import auth, scan, scan_reports
from services import scan_ocr
from database import DatabaseManager
from database.exceptions import IntegrityError
from database.repositories.round_repo import RoundRepositoryDB
from models import Course, Hole, Tee
from tests.integration.conftest import SCHEMA_PATH, _get_test_database_url
from api.messages import (
    CROSS_SITE_REQUEST_REFUSED,
    FRIEND_REQUEST_ALREADY_SENT, FRIEND_REQUEST_AWAITING_YOU, FRIEND_REQUEST_BLOCKED_FOR_THIS_PAIR,
    FRIEND_UNBLOCK_FIRST, USER_TEE_OUTSIDE_COURSE,
    COURSE_NAME_TAKEN, COURSE_PAR_FROM_HOLES, COURSE_PROVIDER_ID_TAKEN, PLAYER_NAME_NOT_READ, UNCLEAR_PLAYER_NAME,
    UNREADABLE_SCORE_ROWS,
)
from scripts.quick_scan_eval import SUITE_MANIFEST_PATHS, grade_case, load_cases
from tests.scan_report_fixtures import pdf_card
from tests.test_mistral_scorecard_parser import EAGLE_VINES_WITH_INITIALS, INCOMPLETE_FULL_ROW

pytestmark = pytest.mark.integration

PASSWORD = "correct horse battery"
APP_ORIGIN = {"Origin": "http://localhost:5173"}
PARS = {n: 4 for n in range(1, 19)} | {3: 3, 7: 3, 12: 3, 16: 3, 5: 5, 9: 5, 13: 5, 18: 5}


async def _reset_schema(url: str) -> None:
    conn = await asyncpg.connect(url)
    try:
        await conn.execute("DROP SCHEMA IF EXISTS courses CASCADE; DROP SCHEMA IF EXISTS users CASCADE;")
        await conn.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
    finally:
        await conn.close()


async def _create_master_course(url: str) -> str:
    pool = await asyncpg.create_pool(url, min_size=1, max_size=1)
    try:
        course = Course(
            name="Master Links",
            total_holes=18,
            holes=[Hole(number=n, par=p, handicap=n) for n, p in PARS.items()],
            tees=[Tee(color="Blue", hole_yardages={n: 400 for n in PARS})],
        )
        return str((await DatabaseManager(pool).courses.create_course(course, user_id=None)).id)
    finally:
        await pool.close()



async def _create_master_courses(url: str, courses: list[Course]) -> list[str]:
    pool = await asyncpg.create_pool(url, min_size=1, max_size=1)
    try:
        db = DatabaseManager(pool)
        return [str((await db.courses.create_course(course, user_id=None)).id) for course in courses]
    finally:
        await pool.close()


class Api:
    def __init__(self, client: TestClient, url: str):
        self.client = client
        self.url = url
        self.emails: list[tuple[str, str, str]] = []

    def token_from(self, kind: str, to: str) -> str:
        link = next(link for k, email, link in reversed(self.emails) if k == kind and email == to)
        return parse_qs(urlparse(link).query)["token"][0]

    def register(self, email: str, name: str = "Golfer") -> None:
        response = self.client.post("/api/auth/register", json={"name": name, "email": email, "password": PASSWORD})
        assert response.status_code == 201, response.text

    def verify(self, email: str) -> None:
        response = self.client.post("/api/auth/verify-email", json={"token": self.token_from("verify", email)})
        assert response.status_code == 200, response.text

    def login(self, email: str, password: str = PASSWORD):
        return self.client.post("/api/auth/login", json={"email": email, "password": password})

    def user(self, email: str) -> dict:
        self.register(email)
        self.verify(email)
        body = self.login(email).json()
        self.client.cookies.clear()
        return {"id": body["user_id"], "headers": {"Authorization": f"Bearer {body['access_token']}"}}


@pytest.fixture
def api(monkeypatch):
    url = _get_test_database_url()
    asyncio.run(_reset_schema(url))
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("SECRET_KEY", "e2e-only-secret-key-not-used-anywhere-else-0123")
    monkeypatch.setenv("APP_ENV", "development")
    for limit in ("REGISTER_RATE_LIMIT_MAX_ATTEMPTS", "REGISTER_RATE_LIMIT_PER_EMAIL_ATTEMPTS",
                  "LOGIN_REQUEST_RATE_LIMIT_MAX_ATTEMPTS", "FORGOT_PASSWORD_RATE_LIMIT_MAX_ATTEMPTS"):
        monkeypatch.setenv(limit, "1000")
    for limiter in (auth.login_rate_limiter, auth.register_rate_limiter, auth.auth_request_rate_limiter):
        empty = copy.copy(limiter._buckets)
        empty.clear()
        monkeypatch.setattr(limiter, "_buckets", empty)
    with TestClient(api_main.create_app(), base_url="http://localhost") as client:
        harness = Api(client, url)
        monkeypatch.setattr(auth, "send_verification_email", AsyncMock(side_effect=lambda to, link: harness.emails.append(("verify", to, link))))
        monkeypatch.setattr(auth, "send_password_reset_email", AsyncMock(side_effect=lambda to, link: harness.emails.append(("reset", to, link))))
        yield harness


def custom_course(api: Api, owner: dict, name: str = "Home Links") -> str:
    response = api.client.post(
        "/api/courses",
        headers=owner["headers"],
        json={
            "name": name,
            "holes": [{"number": n, "par": p, "handicap": n} for n, p in PARS.items()],
            "tees": [{"color": "Blue", "course_rating": 71.2, "slope_rating": 125,
                      "hole_yardages": {str(n): 400 for n in PARS}}],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def save_round(api: Api, owner: dict, course_id: str, over: int = 10, date: str = "2026-10-01") -> str:
    scores = [{"hole_number": n, "strokes": p + (1 if n <= over else 0), "putts": 2} for n, p in PARS.items()]
    response = api.client.post(
        "/api/scan/save",
        headers=owner["headers"],
        json={"course_id": course_id, "tee_box": "Blue", "date": date, "hole_scores": scores},
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def test_register_verify_login_me_logout(api):
    api.register("ada@example.com", name="Ada")

    assert api.login("ada@example.com").status_code == 403
    api.verify("ada@example.com")
    login = api.login("ada@example.com")
    assert login.status_code == 200
    cookie = login.headers["set-cookie"].lower()
    assert "httponly" in cookie

    me = api.client.get("/api/auth/me")
    assert (me.status_code, me.json()["email"], me.json()["name"]) == (200, "ada@example.com", "Ada")

    assert api.client.post("/api/auth/logout", headers=APP_ORIGIN).status_code == 200
    assert api.client.get("/api/auth/me").status_code == 401



def test_long_passwords_are_refused_clearly(api):
    register = lambda email, password: api.client.post(
        "/api/auth/register", json={"name": "Golfer", "email": email, "password": password})

    assert register("ascii@example.com", "a" * 73).status_code == 422
    assert register("accents@example.com", "é" * 40).status_code == 422
    assert register("exact@example.com", "a" * 72).status_code == 201

    api.user("dee@example.com")
    api.client.post("/api/auth/forgot-password", json={"email": "dee@example.com"})
    token = api.token_from("reset", "dee@example.com")
    reset = lambda password: api.client.post(
        "/api/auth/reset-password", json={"token": token, "new_password": password})
    assert reset("a" * 73).status_code == 422
    assert reset("a brand new password").status_code == 200


def test_logout_and_reset_end_sessions(api):
    api.user("dee@example.com")
    me = lambda headers: api.client.get("/api/auth/me", headers=headers).status_code
    device = lambda: {"Authorization": f"Bearer {api.login('dee@example.com').json()['access_token']}"}
    phone, laptop = device(), device()
    api.client.cookies.clear()

    assert api.client.post("/api/auth/logout", headers=phone).status_code == 200
    assert (me(phone), me(laptop)) == (401, 200)

    api.login("dee@example.com")
    assert api.client.get("/api/auth/me").status_code == 200
    assert api.client.post("/api/auth/logout", headers=APP_ORIGIN).status_code == 200
    assert api.client.get("/api/auth/me").status_code == 401

    api.login("dee@example.com")
    cookie_session = api.client.cookies.get("golf_access_token")
    assert api.client.post("/api/auth/logout", headers=laptop).status_code == 200
    assert me({"Authorization": f"Bearer {cookie_session}"}) == 401
    laptop = device()
    api.client.cookies.clear()

    api.client.post("/api/auth/forgot-password", json={"email": "dee@example.com"})
    token = api.token_from("reset", "dee@example.com")
    assert api.client.post("/api/auth/reset-password",
                           json={"token": token, "new_password": "a brand new password"}).status_code == 200
    assert me(laptop) == 401
    assert api.login("dee@example.com").status_code == 401
    assert api.login("dee@example.com", "a brand new password").status_code == 200


def test_cookie_requests_from_other_sites_are_refused(api, scan_providers):
    alice = api.user("alice@example.com")
    course = custom_course(api, alice)
    api.login("alice@example.com")
    evil = {"Origin": "https://evil.example"}
    clone = lambda headers: api.client.post(f"/api/courses/{course}/clone", headers=headers)

    refused = clone(evil)
    assert (refused.status_code, refused.json()["detail"]) == (403, CROSS_SITE_REQUEST_REFUSED)
    assert clone({}).status_code == 403
    assert clone({"Referer": "https://evil.example/page"}).status_code == 403
    assert clone({"Referer": "http://localhost:5173/courses"}).status_code == 201
    assert clone(APP_ORIGIN).status_code == 201
    assert clone({**evil, **alice["headers"]}).status_code == 201
    assert api.client.get("/api/auth/me", headers=evil).status_code == 200

    scan = api.client.post("/api/scan/extract", headers=evil, files=upload())
    assert scan.status_code == 403
    assert scan_providers["ocr"] == []


def test_bad_credentials_and_tokens_are_rejected(api):
    api.user("bob@example.com")

    assert api.login("bob@example.com", password="wrong password!").status_code == 401
    assert api.login("nobody@example.com").status_code == 401
    assert api.client.get("/api/auth/me").status_code == 401
    assert api.client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"}).status_code == 401


def test_verification_token_works_once(api):
    api.register("cy@example.com")
    token = api.token_from("verify", "cy@example.com")

    assert api.client.post("/api/auth/verify-email", json={"token": token}).status_code == 200
    assert api.client.post("/api/auth/verify-email", json={"token": token}).status_code == 400


def test_password_reset_replaces_the_password_and_its_token_works_once(api):
    api.user("dee@example.com")

    assert api.client.post("/api/auth/forgot-password", json={"email": "dee@example.com"}).status_code == 200
    assert api.client.post("/api/auth/forgot-password", json={"email": "dee@example.com"}).status_code == 200
    assert [kind for kind, _, _ in api.emails].count("reset") == 1
    token = api.token_from("reset", "dee@example.com")
    new_password = "a brand new passphrase"
    reset = {"token": token, "new_password": new_password}

    assert api.client.post("/api/auth/reset-password", json=reset).status_code == 200
    assert api.client.post("/api/auth/reset-password", json=reset).status_code == 400
    assert api.login("dee@example.com").status_code == 401
    assert api.login("dee@example.com", password=new_password).status_code == 200


def test_forgot_password_for_an_unknown_email_looks_the_same(api):
    response = api.client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})

    assert response.status_code == 200
    assert api.emails == []


def test_rounds_belong_to_their_owner(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    round_id = save_round(api, alice, custom_course(api, alice))

    assert api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).status_code == 200
    assert api.client.get(f"/api/rounds/{round_id}", headers=bob["headers"]).status_code == 403
    edit = {"hole_scores": [{"hole_number": 1, "strokes": 3}]}
    assert api.client.put(f"/api/rounds/{round_id}", headers=bob["headers"], json=edit).status_code == 403
    assert api.client.delete(f"/api/rounds/{round_id}", headers=bob["headers"]).status_code == 403
    assert api.client.get(f"/api/rounds/user/{alice['id']}", headers=bob["headers"]).status_code == 403
    assert api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).status_code == 200


def test_custom_courses_belong_to_their_owner_and_master_courses_are_read_only(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    private = custom_course(api, alice)
    master = asyncio.run(_create_master_course(api.url))

    assert api.client.get(f"/api/courses/{private}", headers=bob["headers"]).status_code == 403
    assert api.client.put(f"/api/courses/{private}", headers=bob["headers"], json={"name": "Mine"}).status_code == 403
    assert api.client.get(f"/api/courses/{master}", headers=bob["headers"]).status_code == 200
    assert api.client.put(f"/api/courses/{master}", headers=alice["headers"], json={"name": "Mine"}).status_code == 403
    tee = {"name": "Blue", "course_id": private}
    assert api.client.post(f"/api/users/{bob['id']}/tees", headers=bob["headers"], json=tee).status_code == 403


def test_profiles_tees_and_stats_belong_to_their_owner(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    tee = api.client.post(f"/api/users/{alice['id']}/tees", headers=alice["headers"], json={"name": "Gold"}).json()

    assert api.client.get(f"/api/users/{alice['id']}", headers=bob["headers"]).status_code == 403
    assert api.client.patch(f"/api/users/{alice['id']}", headers=bob["headers"], json={"scoring_goal": 80}).status_code == 403
    assert api.client.get(f"/api/users/{alice['id']}/tees", headers=bob["headers"]).status_code == 403
    assert api.client.delete(f"/api/users/{alice['id']}/tees/{tee['id']}", headers=bob["headers"]).status_code == 403
    assert api.client.delete(f"/api/users/{bob['id']}/tees/{tee['id']}", headers=bob["headers"]).status_code == 404
    for path in (f"/api/stats/dashboard/{alice['id']}", f"/api/stats/analytics/{alice['id']}"):
        assert api.client.get(path, headers=bob["headers"]).status_code == 403, path


def test_friends_can_view_analytics_only_after_accepting(api):
    alice, bob, carol = api.user("alice@example.com"), api.user("bob@example.com"), api.user("carol@example.com")
    save_round(api, alice, custom_course(api, alice))
    code = api.client.get(f"/api/users/{bob['id']}", headers=bob["headers"]).json()["friend_code"]
    request = api.client.post("/api/users/me/friends", headers=alice["headers"], json={"addressee_friend_code": code})
    friendship = request.json()["id"]

    assert api.client.get(f"/api/stats/analytics/{alice['id']}", headers=bob["headers"]).status_code == 403
    assert api.client.patch(f"/api/users/me/friends/{friendship}", headers=carol["headers"],
                            json={"status": "accepted"}).status_code in (403, 404)
    assert api.client.patch(f"/api/users/me/friends/{friendship}", headers=bob["headers"],
                            json={"status": "accepted"}).status_code == 200
    analytics = api.client.get(f"/api/stats/analytics/{alice['id']}", headers=bob["headers"])
    assert analytics.status_code == 200 and analytics.json()["kpis"]["total_rounds"] == 1
    assert api.client.get(f"/api/stats/dashboard/{alice['id']}", headers=bob["headers"]).status_code == 403

    comparison = f"/api/stats/{bob['id']}/benchmark?against=friend&friend_id={alice['id']}"
    assert api.client.get(comparison, headers=bob["headers"]).status_code == 200
    assert api.client.get(comparison, headers=carol["headers"]).status_code == 403
    unaccepted = f"/api/stats/{bob['id']}/benchmark?against=friend&friend_id={carol['id']}"
    assert api.client.get(unaccepted, headers=bob["headers"]).status_code == 403


def test_self_only_stats_refuse_everyone_else_even_an_accepted_friend(api):
    alice, bob, carol = api.user("alice@example.com"), api.user("bob@example.com"), api.user("carol@example.com")
    course = custom_course(api, alice)
    round_id = save_round(api, alice, course)
    assert api.client.patch(f"/api/users/{alice['id']}", headers=alice["headers"],
                            json={"scoring_goal": 80}).status_code == 200
    code = api.client.get(f"/api/users/{bob['id']}", headers=bob["headers"]).json()["friend_code"]
    friendship = api.client.post("/api/users/me/friends", headers=alice["headers"],
                                 json={"addressee_friend_code": code}).json()["id"]
    assert api.client.patch(f"/api/users/me/friends/{friendship}", headers=bob["headers"],
                            json={"status": "accepted"}).status_code == 200

    self_only = [
        f"/api/stats/dashboard/{alice['id']}",
        f"/api/stats/{alice['id']}/played-courses",
        f"/api/stats/{alice['id']}/goal-report",
        f"/api/stats/{alice['id']}/benchmark?against=handicap&handicap=15",
        f"/api/stats/compare/{alice['id']}/{round_id}",
        f"/api/stats/course-analytics/{alice['id']}/{course}",
    ]
    for path in self_only:
        assert api.client.get(path, headers=alice["headers"]).status_code == 200, path
        for viewer in (bob, carol):
            assert api.client.get(path, headers=viewer["headers"]).status_code == 403, path
        assert api.client.get(path).status_code == 401, path
    assert api.client.get(f"/api/stats/analytics/{alice['id']}", headers=bob["headers"]).status_code == 200
    assert api.client.get(f"/api/stats/analytics/{alice['id']}", headers=carol["headers"]).status_code == 403
    assert api.client.get(f"/api/stats/milestones/{alice['id']}", headers=alice["headers"]).status_code == 404


def test_saved_round_is_listed_edited_and_deleted(api):
    alice = api.user("alice@example.com")
    round_id = save_round(api, alice, custom_course(api, alice), over=10)

    listed = api.client.get(f"/api/rounds/user/{alice['id']}", headers=alice["headers"]).json()
    assert [(r["id"], r["total_score"], r["to_par"]) for r in listed] == [(round_id, 82, 10)]

    edit = {"hole_scores": [{"hole_number": 1, "strokes": 3, "putts": 1}]}
    edited = api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"], json=edit)
    assert edited.status_code == 200
    detail = api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).json()
    assert sum(hole["strokes"] for hole in detail["hole_scores"]) == 80

    dashboard = api.client.get(f"/api/stats/dashboard/{alice['id']}", headers=alice["headers"]).json()
    assert (dashboard["scoring_average"], dashboard["best_round"]) == (80.0, 80)

    assert api.client.delete(f"/api/rounds/{round_id}", headers=alice["headers"]).status_code == 204
    assert api.client.get(f"/api/rounds/user/{alice['id']}", headers=alice["headers"]).json() == []


def _round_with_breakdown(api, owner, course):
    scores = [{"hole_number": n, "strokes": p + 1, "putts": 2, "shots_to_green": p - 1} for n, p in PARS.items()]
    response = api.client.post("/api/scan/save", headers=owner["headers"], json={
        "course_id": course, "tee_box": "Blue", "date": "2026-10-01", "hole_scores": scores,
    })
    assert response.status_code == 200, response.text
    return response.json()["id"]


async def _mark_unplayed(url, round_id, hole_number):
    conn = await asyncpg.connect(url)
    try:
        await conn.execute(
            """UPDATE users.hole_scores SET played=false, strokes=NULL, putts=NULL, shots_to_green=NULL
               WHERE round_id=$1 AND hole_number=$2""",
            uuid.UUID(round_id), hole_number,
        )
    finally:
        await conn.close()


def editor_payload(detail, changes=None):
    holes = []
    for hole in detail["hole_scores"]:
        edited = (changes or {}).get(hole["hole_number"], {})
        holes.append({
            "hole_number": hole["hole_number"],
            "strokes": edited.get("strokes", hole["strokes"]),
            "putts": edited.get("putts", hole["putts"]),
            "fairway_hit": hole["fairway_hit"],
            "green_in_regulation": hole["green_in_regulation"],
        })
    return {"hole_scores": holes, "tee_box": detail["tee_box"]}


def test_saving_from_the_round_editor_keeps_what_it_does_not_send(api):
    alice = api.user("alice@example.com")
    round_id = _round_with_breakdown(api, alice, custom_course(api, alice))
    asyncio.run(_mark_unplayed(api.url, round_id, 18))
    assert api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"],
                          json={"notes": "windy"}).status_code == 200
    get = lambda: api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).json()
    before = get()

    saved = api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"],
                           json=editor_payload(before, {1: {"strokes": 4}}))
    assert saved.status_code == 200, saved.text
    after = get()

    holes = {h["hole_number"]: h for h in after["hole_scores"]}
    assert holes[1]["strokes"] == 4
    assert [holes[n]["shots_to_green"] for n in range(1, 18)] == [PARS[n] - 1 for n in range(1, 18)]
    assert (holes[18]["played"], holes[18]["strokes"]) == (False, None)
    assert [(h["par"], h["handicap"]) for h in after["hole_scores"]] == [(h["par"], h["handicap"]) for h in before["hole_scores"]]
    assert (after["notes"], after["tee_box"]) == ("windy", "Blue")

    completed = api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"],
                              json=editor_payload(after, {18: {"strokes": 5, "putts": 2}}))
    assert completed.status_code == 200, completed.text
    persisted = get()
    last_hole = next(h for h in persisted["hole_scores"] if h["hole_number"] == 18)
    assert (last_hole["played"], last_hole["strokes"], last_hole["putts"]) == (True, 5, 2)
    assert persisted["holes_played"] == 18


def test_round_editor_can_correct_strokes_below_the_stored_shots_to_green(api):
    alice = api.user("alice@example.com")
    round_id = _round_with_breakdown(api, alice, custom_course(api, alice))
    get = lambda: api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).json()
    before = get()

    corrected = api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"],
                              json=editor_payload(before, {1: {"strokes": 2, "putts": 1}}))
    assert corrected.status_code == 200, corrected.text
    holes = {h["hole_number"]: h for h in get()["hole_scores"]}
    assert (holes[1]["strokes"], holes[1]["putts"], holes[1]["shots_to_green"]) == (2, 1, None)
    assert holes[2]["shots_to_green"] == 3
    assert (holes[1]["par"], holes[1]["handicap"]) == (before["hole_scores"][0]["par"], before["hole_scores"][0]["handicap"])

    replacement = api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"], json={
        "hole_scores": [{"hole_number": 2, "strokes": 2, "putts": 1, "shots_to_green": 1}],
    })
    assert replacement.status_code == 200, replacement.text
    second = next(h for h in get()["hole_scores"] if h["hole_number"] == 2)
    assert (second["strokes"], second["shots_to_green"]) == (2, 1)

    rejected = api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"], json={
        "hole_scores": [{"hole_number": 2, "shots_to_green": 3}, {"hole_number": 3, "strokes": 7}],
    })
    assert rejected.status_code == 422, rejected.text
    unchanged = {h["hole_number"]: h for h in get()["hole_scores"]}
    assert unchanged[2]["shots_to_green"] == 1
    assert unchanged[3]["strokes"] == 4


def test_a_hole_edit_changes_only_the_fields_it_sends(api):
    alice = api.user("alice@example.com")
    round_id = _round_with_breakdown(api, alice, custom_course(api, alice))
    edit = lambda body: api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"], json=body)
    hole = lambda body: {h["hole_number"]: h for h in body["hole_scores"]}[1]

    putts_only = edit({"hole_scores": [{"hole_number": 1, "putts": 1}]})
    assert putts_only.status_code == 200, putts_only.text
    assert (hole(putts_only.json())["strokes"], hole(putts_only.json())["putts"]) == (5, 1)
    assert hole(putts_only.json())["shots_to_green"] == 3

    cleared = edit({"hole_scores": [{"hole_number": 1, "strokes": None}]})
    assert cleared.status_code == 200, cleared.text
    assert (hole(cleared.json())["strokes"], hole(cleared.json())["putts"]) == (None, 1)
    assert hole(cleared.json())["shots_to_green"] == 3

    too_many = edit({"hole_scores": [{"hole_number": 2, "putts": 9}, {"hole_number": 3, "strokes": 7}]})
    assert too_many.status_code == 422
    unchanged = api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).json()
    assert [(h["strokes"], h["putts"]) for h in unchanged["hole_scores"][1:3]] == [(5, 2), (4, 2)]


def test_null_clears_round_fields_and_omitting_them_keeps_them(api):
    alice = api.user("alice@example.com")
    course = custom_course(api, alice)
    round_id = _round_with_breakdown(api, alice, course)
    edit = lambda body: api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"], json=body).json()

    named = edit({"notes": "windy", "course_name_played": "Typed Links"})
    assert (named["notes"], named["tee_box"], named["course_name_played"]) == ("windy", "Blue", "Typed Links")
    kept = edit({"weather_conditions": "rain"})
    assert (kept["notes"], kept["tee_box"], kept["course_name_played"]) == ("windy", "Blue", "Typed Links")

    cleared = edit({"notes": None, "tee_box": None, "course_name_played": None})
    assert (cleared["notes"], cleared["tee_box"], cleared["course_name_played"]) == (None, None, None)
    assert cleared["course"]["name"] == "Home Links"


@pytest.mark.parametrize("failure", ["invalid_link", "deleted_round"])
def test_a_failed_course_link_leaves_the_course_unfilled(api, monkeypatch, failure):
    alice = api.user("alice@example.com")
    round_id = _round_with_breakdown(api, alice, custom_course(api, alice))
    bare = api.client.post("/api/courses", headers=alice["headers"], json={
        "name": "Bare Links", "holes": [{"number": n, "par": p} for n, p in PARS.items()],
        "tees": [{"color": "Blue"}],
    })
    assert bare.status_code == 201, bare.text
    bare_id = bare.json()["id"]

    original_link = RoundRepositoryDB.link_course_to_round

    async def link_fails(self, *args, **kwargs):
        if failure == "invalid_link":
            raise IntegrityError("link rejected after the gap fill")
        conn = await asyncpg.connect(api.url)
        try:
            await conn.execute("DELETE FROM users.rounds WHERE id=$1", uuid.UUID(round_id))
        finally:
            await conn.close()
        return await original_link(self, *args, **kwargs)

    monkeypatch.setattr(RoundRepositoryDB, "link_course_to_round", link_fails)
    linked = api.client.post(f"/api/rounds/{round_id}/link-course", headers=alice["headers"],
                             json={"course_id": bare_id})
    assert linked.status_code == (422 if failure == "invalid_link" else 404), linked.text

    course = api.client.get(f"/api/courses/{bare_id}", headers=alice["headers"]).json()
    blue = next(t for t in course["tees"] if t["color"] == "Blue")
    assert (blue["course_rating"], blue["slope_rating"], blue["hole_yardages"]) == (None, None, {})
    assert [h["handicap"] for h in course["holes"]] == [None] * 18
    remaining = api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"])
    if failure == "invalid_link":
        assert remaining.json()["course"]["name"] == "Home Links"
    else:
        assert remaining.status_code == 404


SCORECARD_DIR = Path(__file__).resolve().parents[1] / "test_scorecards"
EAGLE_VINES = next(
    case for case in json.loads((SCORECARD_DIR / "quick_eval_cases.json").read_text())["cases"]
    if case["id"] == "eagle_vines_tucker"
)
EAGLE_VINES_STROKES = {int(hole): strokes for hole, strokes in EAGLE_VINES["expected"]["strokes"].items()}


@pytest.fixture
def scan_providers(monkeypatch):
    calls = {"ocr": [], "merge": [], "ocr_bytes": []}

    async def fake_ocr(self, file_path, **kwargs):
        data = await asyncio.to_thread(Path(file_path).read_bytes)
        calls["ocr_bytes"].append(data)
        if data.startswith(b"%PDF-"):
            calls["ocr"].append("PDF")
        else:
            with Image.open(file_path) as image:
                calls["ocr"].append(image.format)
        return {"pages": [{"markdown": EAGLE_VINES_WITH_INITIALS}]}

    async def fake_merge(markdown, diagnostics=None):
        calls["merge"].append(markdown)
        return markdown

    monkeypatch.setattr(scan_ocr.MistralOCRService, "ocr_file", fake_ocr)
    monkeypatch.setattr(scan_ocr, "merge_split_tables", fake_merge)
    return calls


def upload(name: str = "eaglevins_90.jpg") -> dict:
    return {"file": (name, (SCORECARD_DIR / name).read_bytes(), "image/jpeg")}


def test_scan_pipeline_turns_an_uploaded_scorecard_into_a_saved_round(api, scan_providers):
    alice = api.user("alice@example.com")

    ocr = api.client.post("/api/scan/ocr", headers=alice["headers"], files=upload())
    assert ocr.status_code == 200, ocr.text
    assert scan_providers["ocr"] == ["JPEG"] and len(scan_providers["merge"]) == 1
    extract = api.client.post(
        "/api/scan/extract",
        headers=alice["headers"],
        files=upload(),
        data={"ocr_text": ocr.json()["ocr_text"], "user_context": EAGLE_VINES["user_context"]},
    )
    assert extract.status_code == 200, extract.text
    assert len(scan_providers["ocr"]) == 1
    extracted = extract.json()["round"]
    assert {h["hole_number"]: h["strokes"] for h in extracted["hole_scores"]} == EAGLE_VINES_STROKES

    unreviewed = {"tee_box": "White", "date": "2026-10-02", "hole_scores": extracted["hole_scores"]}
    no_course = api.client.post("/api/scan/save", headers=alice["headers"], json=unreviewed)
    assert no_course.status_code == 422, no_course.text
    assert api.client.get(f"/api/rounds/user/{alice['id']}", headers=alice["headers"]).json() == []

    reviewed = unreviewed | {
        "course_name": "Eagle Vines",
        "course_holes": [{"hole_number": h["number"], "par": h["par"]} for h in extracted["course"]["holes"]],
        "tee_yardages": {str(n): 380 for n in range(1, 19)},
    }
    saved = api.client.post("/api/scan/save", headers=alice["headers"], json=reviewed)
    assert saved.status_code == 200, saved.text
    assert saved.json()["total_score"] == sum(EAGLE_VINES_STROKES.values()) == 90

    detail = api.client.get(f"/api/rounds/{saved.json()['id']}", headers=alice["headers"]).json()
    assert {h["hole_number"]: h["strokes"] for h in detail["hole_scores"]} == EAGLE_VINES_STROKES
    assert sum(h["par_played"] for h in detail["hole_scores"]) == 72
    course_id = detail["course"]["id"]
    assert detail["course"]["name"] == "Eagle Vines"
    bob = api.user("bob@example.com")
    assert api.client.get(f"/api/courses/{course_id}", headers=bob["headers"]).status_code == 403

    again = api.client.post("/api/scan/save", headers=alice["headers"], json=reviewed | {"date": "2026-10-09"})
    assert again.status_code == 200, again.text
    second = api.client.get(f"/api/rounds/{again.json()['id']}", headers=alice["headers"]).json()
    assert second["course"]["id"] == course_id


def test_scan_extract_and_save_refuse_another_users_course(api, scan_providers):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    private = custom_course(api, alice)

    extract = api.client.post(
        "/api/scan/extract",
        headers=bob["headers"],
        files=upload(),
        data={"ocr_text": EAGLE_VINES_WITH_INITIALS, "course_id": private},
    )
    assert extract.status_code == 403, extract.text
    scores = [{"hole_number": n, "strokes": p} for n, p in PARS.items()]
    save = api.client.post("/api/scan/save", headers=bob["headers"],
                           json={"course_id": private, "tee_box": "Blue", "hole_scores": scores})
    assert save.status_code == 400, save.text
    assert api.client.get(f"/api/rounds/user/{bob['id']}", headers=bob["headers"]).json() == []
    assert api.client.post("/api/scan/save", headers=alice["headers"],
                           json={"course_id": private, "tee_box": "Blue", "hole_scores": scores}).status_code == 200
    assert scan_providers["ocr"] == []


MISTRAL_FIXTURES = Path(__file__).resolve().parent / "fixtures" / "mistral"
EVAL_CASES = {
    case.case_id: case for suite in ("quick", "large") for case in load_cases(SUITE_MANIFEST_PATHS[suite])
}
FIXTURE_MINIMUMS = {
    "360_ewa_beach_d": 17, "360_ewa_beach_g": 18, "bay_view_d": 52, "bay_view_g": 53,
    "blackhawk_falls_derek": 51, "blue_rock_springs_west_g": 53, "boundary_oaks_d": 53,
    "boundary_oaks_g": 53, "corica_park_south_d": 53, "diablo_creek_d": 54, "diablo_creek_g": 54,
    "franklin_canyon_d": 54, "franklin_canyon_g": 54, "ko_olina_d": 53, "ko_olina_g": 54,
    "lake_chabot_d": 31, "lake_chabot_g": 33,
    "metropolitan_d": 54, "rancho_solano_d": 43, "rancho_solano_g": 54, "shadow_lakes_d": 54,
    "yocha_dehe_g": 49,
    "blue_rock_tucker": 18, "eagle_vines_tucker": 18, "half_moon_bay_g": 54, "half_moon_bay_t": 54,
}


def test_every_eval_case_is_covered_by_a_capture_and_a_minimum():
    assert set(FIXTURE_MINIMUMS) == set(EVAL_CASES)
    for case in EVAL_CASES.values():
        assert (MISTRAL_FIXTURES / f"{case.image.rsplit('.', 1)[0]}.json").is_file(), case.image


@pytest.fixture
def mistral_capture(monkeypatch):
    state = {"image": None, "merge_diagnostics": []}

    async def fake_ocr(self, file_path, **kwargs):
        return json.loads((MISTRAL_FIXTURES / f"{state['image']}.json").read_text())

    async def fake_merge(markdown, diagnostics=None):
        if diagnostics is not None:
            diagnostics.append("table merge skipped by the test")
            state["merge_diagnostics"].append(diagnostics)
        return markdown

    monkeypatch.setattr(scan_ocr.MistralOCRService, "ocr_file", fake_ocr)
    monkeypatch.setattr(scan_ocr, "merge_split_tables", fake_merge)
    return state


def extract_case(api, mistral_capture, case_id: str):
    case = EVAL_CASES[case_id]
    mistral_capture["image"] = case.image.rsplit(".", 1)[0]
    alice = api.user(f"{case_id}@example.com")
    ocr = api.client.post("/api/scan/ocr", headers=alice["headers"], files=upload(case.image))
    assert ocr.status_code == 200, ocr.text
    extract = api.client.post(
        "/api/scan/extract",
        headers=alice["headers"],
        files=upload(case.image),
        data={"ocr_text": ocr.json()["ocr_text"], "user_context": case.user_context},
    )
    return case, extract


@pytest.mark.parametrize("case_id", sorted(FIXTURE_MINIMUMS))
def test_mistral_captures_extract_the_expected_scores(api, mistral_capture, case_id):
    case, extract = extract_case(api, mistral_capture, case_id)
    assert extract.status_code == 200, extract.text
    body = extract.json()
    assert set(body) == {"round", "confidence", "fields_needing_review"}

    graded = grade_case(case, body["round"]["hole_scores"])
    assert graded.matched_cells >= FIXTURE_MINIMUMS[case_id], graded.mismatches
    assert mistral_capture["merge_diagnostics"]


def test_missing_name_fallback_flags_the_round_for_review(api, mistral_capture):
    # Mistral read every digit of D's rows on this card but left the name cell blank.
    _case, extract = extract_case(api, mistral_capture, "rancho_solano_d")
    assert extract.status_code == 200, extract.text
    body = extract.json()
    assert sum(h["strokes"] is not None for h in body["round"]["hole_scores"]) >= 17
    assert PLAYER_NAME_NOT_READ in body["fields_needing_review"]
    _case, found = extract_case(api, mistral_capture, "rancho_solano_g")
    assert PLAYER_NAME_NOT_READ not in found.json()["fields_needing_review"]


def test_scan_error_message_matches_what_was_detected(api, scan_providers):
    alice = api.user("alice@example.com")

    def extract(ocr_text: str, name: str):
        return api.client.post(
            "/api/scan/extract", headers=alice["headers"], files=upload(),
            data={"ocr_text": ocr_text, "user_context": f"my name is {name}. no putts recorded"},
        )

    nobody = extract(EAGLE_VINES_WITH_INITIALS, "Zed")
    assert nobody.status_code == 422, nobody.text
    assert nobody.json() == {"detail": UNCLEAR_PLAYER_NAME, "failure": {"category": "unreadable_scores", "stage": "parse"}}

    unreadable = extract(INCOMPLETE_FULL_ROW, "Tucker")
    assert unreadable.status_code == 422, unreadable.text
    assert unreadable.json() == {
        "detail": UNREADABLE_SCORE_ROWS, "failure": {"category": "unreadable_scores", "stage": "parse"},
    }


@pytest.fixture
def scan_markdown(scan_providers, monkeypatch):
    state = {"text": EAGLE_VINES_WITH_INITIALS, "merge_result": None}

    async def fake_ocr(self, file_path, **kwargs):
        return {"pages": [{"markdown": state["text"]}]}

    async def fake_merge(markdown, diagnostics=None):
        scan_providers["merge"].append(markdown)
        return state["merge_result"] if state["merge_result"] is not None else markdown

    monkeypatch.setattr(scan_ocr.MistralOCRService, "ocr_file", fake_ocr)
    monkeypatch.setattr(scan_ocr, "merge_split_tables", fake_merge)
    return state, scan_providers


def scan_table(scores, pars):
    def row(label, values):
        return "| " + " | ".join([label, *[str(v) if v is not None else "" for v in values]]) + " |"

    return "\n".join([row("HOLE", range(1, 19)), row("Golfer", scores), row("PAR", pars)])


def test_scan_keeps_hole_identity_and_only_reports_complete_par(api, scan_markdown):
    state, _ = scan_markdown
    alice = api.user("scan-layout@example.com")
    course_id = custom_course(api, alice)

    async def remove_hole_rows():
        conn = await asyncpg.connect(api.url)
        try:
            await conn.execute("DELETE FROM courses.holes WHERE course_id=$1 AND hole_number < 10", uuid.UUID(course_id))
        finally:
            await conn.close()

    asyncio.run(remove_hole_rows())
    state["text"] = scan_table([4] * 18, [4] * 18)
    context = "my name is Golfer. scores written as raw strokes. no putts recorded."
    response = api.client.post("/api/scan/extract", headers=alice["headers"], files=upload(),
                               data={"course_id": course_id, "user_context": context})
    assert response.status_code == 200, response.text
    round_data = response.json()["round"]
    assert [(h["hole_number"], h["strokes"]) for h in round_data["hole_scores"]] == [(n, 4) for n in range(1, 19)]
    assert [h["number"] for h in round_data["course"]["holes"]] == list(range(1, 19))
    assert round_data["course"]["holes"][9]["handicap"] == 10
    assert round_data["course"]["holes"][0]["par"] == 4

    state["text"] = scan_table([4] * 18, [4] * 9 + [None] * 9)
    response = api.client.post("/api/scan/extract", headers=alice["headers"], files=upload(), data={"user_context": context})
    assert response.status_code == 200, response.text
    assert response.json()["round"]["course"]["par"] is None
    assert len(response.json()["round"]["hole_scores"]) == 18


def test_scan_misread_and_conflicting_scores_are_flagged_for_review(api, scan_markdown):
    state, _ = scan_markdown
    state["text"] = scan_table([-4] + [1] * 17, [4] * 18)
    response = api.client.post("/api/scan/extract", files=upload(),
                               data={"user_context": "my name is Golfer. scores written to par. no putts recorded."})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["round"]["hole_scores"][0]["strokes"] is None
    assert "Hole 1 score couldn't be read; check it" in body["fields_needing_review"]
    assert body["confidence"]["hole_scores"][0]["fields"]["strokes"]["level"] == "very_low"

    state["text"] = "\n".join([
        "| HOLE | " + " | ".join(map(str, range(1, 10))) + " |",
        "| G | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |",
        "| | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |",
        "| | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |",
        "| Par | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 |",
    ])
    response = api.client.post("/api/scan/extract", files=upload(), data={"user_context": (
        "my name is G. scores written to par. name on score row. row order: score, putts, shots to green"
    )})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["round"]["hole_scores"][0]["strokes"] == 3
    assert "Hole 1 score sign corrected (birdie vs bogey disambiguated)" in body["fields_needing_review"]
    assert body["confidence"]["hole_scores"][0]["fields"]["strokes"]["level"] == "high"
    assert body["confidence"]["hole_scores"][1]["fields"]["strokes"]["level"] == "high"

    state["text"] = state["text"].replace("| G | 1 |", "| G | 2 |", 1)
    response = api.client.post("/api/scan/extract", files=upload(), data={"user_context": (
        "my name is G. scores written to par. name on score row. row order: score, putts, shots to green"
    )})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["round"]["hole_scores"][0]["strokes"] == 6
    assert "Hole 1 score breakdown conflicts with total strokes" in body["fields_needing_review"]
    assert body["confidence"]["hole_scores"][0]["fields"]["strokes"]["level"] == "medium"


@pytest.mark.parametrize("route", ["ocr", "extract"])
@pytest.mark.parametrize("source", ["provider", "merge"])
def test_scan_rejects_oversized_ocr_at_both_boundaries(api, scan_markdown, route, source):
    state, calls = scan_markdown
    limit = scan.MAX_OCR_TEXT_CHARS
    if source == "provider":
        state["text"] = "x" * (limit + 1)
    else:
        state["merge_result"] = "x" * (limit + 1)
    response = api.client.post(f"/api/scan/{route}", files=upload())
    assert response.status_code == 422, response.text[:300]
    expected = {"detail": "This file has more text than a scorecard. Try a photo of just the card."}
    if route == "extract":
        expected["failure"] = {"category": "unreadable_scores", "stage": "ocr"}
    assert response.json() == expected
    assert len(calls["merge"]) == (0 if source == "provider" else 1)


@pytest.mark.parametrize("route", ["ocr", "extract"])
def test_scan_accepts_ocr_exactly_at_the_limit(api, scan_markdown, route):
    state, calls = scan_markdown
    markdown = EAGLE_VINES_WITH_INITIALS + "\n"
    state["text"] = markdown + "x" * (scan.MAX_OCR_TEXT_CHARS - len(markdown))
    response = api.client.post(f"/api/scan/{route}", files=upload(), data={"user_context": EAGLE_VINES["user_context"]})
    assert response.status_code == 200, response.text[:300]
    assert len(calls["merge"][0]) == scan.MAX_OCR_TEXT_CHARS
    if route == "ocr":
        assert len(response.json()["ocr_text"]) == scan.MAX_OCR_TEXT_CHARS
    else:
        assert {h["hole_number"]: h["strokes"] for h in response.json()["round"]["hole_scores"]} == EAGLE_VINES_STROKES


def mint_token(user_id: str, *, expires_in: timedelta, secret: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": user_id,
        "iat": now - timedelta(hours=2),
        "exp": now + expires_in,
        "iss": auth_utils.get_jwt_issuer(),
        "aud": auth_utils.get_jwt_audience(),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(claims, secret or auth_utils.get_secret_key(), algorithm=auth_utils.ALGORITHM)


def test_expired_and_forged_tokens_are_rejected(api):
    alice = api.user("alice@example.com")
    bearer = lambda token: {"Authorization": f"Bearer {token}"}

    assert api.client.get("/api/auth/me", headers=alice["headers"]).status_code == 200
    without_session = mint_token(alice["id"], expires_in=timedelta(hours=1))
    assert api.client.get("/api/auth/me", headers=bearer(without_session)).status_code == 401

    expired = mint_token(alice["id"], expires_in=timedelta(hours=-1))
    assert api.client.get("/api/auth/me", headers=bearer(expired)).status_code == 401
    assert api.client.get(f"/api/rounds/user/{alice['id']}", headers=bearer(expired)).status_code == 401
    api.client.cookies.set(auth_utils.get_access_token_cookie_name(), expired)
    assert api.client.get("/api/auth/me").status_code == 401
    api.client.cookies.clear()

    forged = mint_token(alice["id"], expires_in=timedelta(hours=1), secret="some-other-secret-key-0123456789abcdef")
    assert api.client.get("/api/auth/me", headers=bearer(forged)).status_code == 401


def test_compare_goal_report_and_course_analytics_are_owner_only(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    course = custom_course(api, alice)
    round_id = save_round(api, alice, course)
    for user in (alice, bob):
        goal = api.client.patch(f"/api/users/{user['id']}", headers=user["headers"], json={"scoring_goal": 85})
        assert goal.status_code == 200, goal.text
    alices = {
        "compare": f"/api/stats/compare/{alice['id']}/{round_id}",
        "goal": f"/api/stats/{alice['id']}/goal-report",
        "course": f"/api/stats/course-analytics/{alice['id']}/{course}",
    }

    for path in alices.values():
        assert api.client.get(path, headers=alice["headers"]).status_code == 200, path
        assert api.client.get(path, headers=bob["headers"]).status_code == 403, path

    assert api.client.get(f"/api/stats/compare/{bob['id']}/{round_id}", headers=bob["headers"]).status_code == 404
    seen = api.client.get(f"/api/stats/course-analytics/{bob['id']}/{course}", headers=bob["headers"])
    assert seen.status_code == 200
    assert (seen.json()["rounds_played"], seen.json()["score_trend"]) == (0, [])
    assert api.client.get(f"/api/stats/{bob['id']}/goal-report", headers=bob["headers"]).json()["gap"] is None


def test_round_relinks_to_master_and_cloned_courses_with_ownership(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    master = asyncio.run(_create_master_course(api.url))
    round_id = save_round(api, alice, custom_course(api, alice))
    link = lambda user, course: api.client.post(
        f"/api/rounds/{round_id}/link-course", headers=user["headers"], json={"course_id": course})

    assert link(bob, master).status_code == 403
    assert link(alice, custom_course(api, bob, name="Bob's Links")).status_code == 403
    assert link(alice, str(uuid.uuid4())).status_code == 404

    relinked = link(alice, master)
    assert relinked.status_code == 200, relinked.text
    assert relinked.json()["course_id"] == master
    detail = api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).json()
    assert detail["course"]["name"] == "Master Links"
    assert sum(h["strokes"] for h in detail["hole_scores"]) == 82

    clone = api.client.post(f"/api/courses/{master}/clone", headers=alice["headers"])
    assert clone.status_code == 201, clone.text
    clone_id = clone.json()["id"]
    assert (clone.json()["total_holes"], clone.json()["tee_count"], clone.json()["par"]) == (18, 1, 72)
    assert api.client.get(f"/api/courses/{clone_id}", headers=alice["headers"]).status_code == 200
    assert api.client.get(f"/api/courses/{clone_id}", headers=bob["headers"]).status_code == 403
    again = api.client.post(f"/api/courses/{master}/clone", headers=alice["headers"])
    assert (again.status_code, again.json()["id"]) == (201, clone_id)
    assert api.client.post(f"/api/courses/{clone_id}/clone", headers=bob["headers"]).status_code == 403

    assert link(alice, clone_id).status_code == 200
    rounds_on = lambda course: api.client.get(
        f"/api/stats/course-analytics/{alice['id']}/{course}", headers=alice["headers"]).json()["rounds_played"]
    assert (rounds_on(clone_id), rounds_on(master)) == (1, 0)


def test_user_tee_update_and_delete(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    tees = f"/api/users/{alice['id']}/tees"
    yardages = lambda y: {str(n): y for n in range(1, 19)}
    gold = api.client.post(tees, headers=alice["headers"], json={"name": "Gold", "hole_yardages": yardages(300)})
    assert gold.status_code == 201, gold.text
    tee = f"{tees}/{gold.json()['id']}"
    assert api.client.post(tees, headers=alice["headers"], json={"name": "Silver"}).status_code == 201

    renamed = api.client.put(tee, headers=alice["headers"], json={"name": "Black", "hole_yardages": yardages(350)})
    assert renamed.status_code == 200, renamed.text
    listed = {t["name"]: t for t in api.client.get(tees, headers=alice["headers"]).json()}
    assert set(listed) == {"Black", "Silver"}
    assert {int(k): v for k, v in listed["Black"]["hole_yardages"].items()} == {n: 350 for n in range(1, 19)}

    assert api.client.put(tee, headers=alice["headers"], json={"name": "Silver"}).status_code == 409
    bobs_url = f"/api/users/{bob['id']}/tees/{gold.json()['id']}"
    assert api.client.put(bobs_url, headers=bob["headers"], json={"name": "Stolen"}).status_code == 404
    assert {t["name"] for t in api.client.get(tees, headers=alice["headers"]).json()} == {"Black", "Silver"}

    assert api.client.delete(tee, headers=alice["headers"]).status_code == 204
    assert [t["name"] for t in api.client.get(tees, headers=alice["headers"]).json()] == ["Silver"]
    assert api.client.delete(tee, headers=alice["headers"]).status_code == 404


def test_user_tee_updates_clear_rate_and_respect_the_course_layout(api):
    alice = api.user("alice@example.com")
    headers = alice["headers"]
    tees = f"/api/users/{alice['id']}/tees"
    course = custom_course(api, alice)
    nine = api.client.post("/api/courses", headers=headers, json={
        "name": "Nine Links", "holes": [{"number": n, "par": 4} for n in range(1, 10)]}).json()["id"]
    edit = lambda tee, body: api.client.put(f"{tees}/{tee}", headers=headers, json=body)

    rated = api.client.post(tees, headers=headers, json={
        "name": "Gold", "course_id": course, "slope_rating": 120, "course_rating": 70.0,
        "hole_yardages": {str(n): 300 for n in range(1, 19)}}).json()
    cleared = edit(rated["id"], {"slope_rating": None, "course_rating": None, "hole_yardages": None})
    assert cleared.status_code == 200, cleared.text
    assert (cleared.json()["slope_rating"], cleared.json()["course_rating"], cleared.json()["hole_yardages"]) == (
        None, None, {})
    assert edit(rated["id"], {"name": None}).status_code == 422
    assert edit(rated["id"], {}).json()["name"] == "Gold"

    later = api.client.post(tees, headers=headers, json={"name": "Silver", "course_id": course}).json()
    rated_later = edit(later["id"], {"slope_rating": 125, "course_rating": 71.0}).json()
    assert rated_later["rating_holes"] == rated["rating_holes"] == list(range(1, 19))

    outside = {"name": "Short", "course_id": nine, "hole_yardages": {"9": 300, "15": 300}}
    refused = api.client.post(tees, headers=headers, json=outside)
    assert (refused.status_code, refused.json()["detail"]) == (422, USER_TEE_OUTSIDE_COURSE)
    short = api.client.post(tees, headers=headers, json={**outside, "hole_yardages": {"9": 300}}).json()
    assert edit(short["id"], {"hole_yardages": {"15": 300}}).status_code == 422
    assert edit(short["id"], {"hole_yardages": {"8": 290}}).json()["hole_yardages"] == {"8": 290}


def test_friendship_lifecycle_is_private_and_reversible(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    code = lambda user: api.client.get(f"/api/users/{user['id']}", headers=user["headers"]).json()["friend_code"]
    send = lambda sender, to: api.client.post(
        "/api/users/me/friends", headers=sender["headers"], json={"addressee_friend_code": code(to)})
    answer = lambda user, friendship, status: api.client.patch(
        f"/api/users/me/friends/{friendship}", headers=user["headers"], json={"status": status})
    remove = lambda user, friendship: api.client.delete(f"/api/users/me/friends/{friendship}", headers=user["headers"])
    listed = lambda user: api.client.get("/api/users/me/friends", headers=user["headers"]).json()
    conflict = lambda response: (response.status_code, response.json()["detail"])

    sent = send(alice, bob)
    assert sent.status_code == 201, sent.text
    friendship = sent.json()["id"]
    rows = [sent.json(), *listed(alice), *listed(bob)]
    assert all(row["requester_email"] is None and row["addressee_email"] is None for row in rows)
    assert conflict(send(alice, bob)) == (409, FRIEND_REQUEST_ALREADY_SENT)
    assert conflict(send(bob, alice)) == (409, FRIEND_REQUEST_AWAITING_YOU)

    assert answer(bob, friendship, "declined").status_code == 200
    assert conflict(send(alice, bob)) == (409, FRIEND_REQUEST_BLOCKED_FOR_THIS_PAIR)
    assert remove(alice, friendship).status_code == 404
    assert answer(alice, friendship, "blocked").status_code == 404
    assert remove(alice, friendship).status_code == 404
    assert conflict(send(alice, bob)) == (409, FRIEND_REQUEST_BLOCKED_FOR_THIS_PAIR)
    from_bob = send(bob, alice)
    assert (from_bob.status_code, from_bob.json()["status"], from_bob.json()["requester_id"]) == (
        201, "pending", bob["id"])
    assert answer(alice, friendship, "accepted").status_code == 200

    assert remove(alice, friendship).status_code == 204
    assert listed(alice) == listed(bob) == []
    friendship = send(bob, alice).json()["id"]
    assert answer(alice, friendship, "accepted").status_code == 200

    assert answer(bob, friendship, "blocked").json()["requester_id"] == bob["id"]
    assert listed(alice) == []
    assert conflict(send(alice, bob)) == (409, FRIEND_REQUEST_BLOCKED_FOR_THIS_PAIR)
    assert remove(alice, friendship).status_code == 404
    assert answer(alice, friendship, "blocked").status_code == 404
    assert conflict(send(bob, alice)) == (409, FRIEND_UNBLOCK_FIRST)
    assert remove(bob, friendship).status_code == 204
    assert send(alice, bob).status_code == 201


def test_stats_endpoints_answer_from_seeded_rounds(api):
    alice = api.user("alice@example.com")
    course = custom_course(api, alice)
    rounds = [save_round(api, alice, course, over=over, date=day)
              for over, day in ((10, "2026-09-01"), (6, "2026-09-08"), (14, "2026-09-15"))]
    assert api.client.patch(f"/api/users/{alice['id']}", headers=alice["headers"],
                            json={"scoring_goal": 80}).status_code == 200
    get = lambda path: api.client.get(path, headers=alice["headers"])
    paths = {
        "dashboard": f"/api/stats/dashboard/{alice['id']}",
        "analytics": f"/api/stats/analytics/{alice['id']}",
        "played": f"/api/stats/{alice['id']}/played-courses",
        "goal": f"/api/stats/{alice['id']}/goal-report",
        "compare": f"/api/stats/compare/{alice['id']}/{rounds[1]}",
        "course": f"/api/stats/course-analytics/{alice['id']}/{course}",
    }
    responses = {name: get(path) for name, path in paths.items()}
    assert {name: r.status_code for name, r in responses.items()} == {name: 200 for name in paths}
    body = {name: r.json() for name, r in responses.items()}

    assert (body["dashboard"]["scoring_average"], body["dashboard"]["best_round"]) == (82.0, 78)
    assert body["analytics"]["kpis"]["total_rounds"] == 3
    assert [c["id"] for c in body["played"]] == [course]
    assert (body["goal"]["scoring_average"], body["goal"]["lowest_score"], body["goal"]["gap"],
            body["goal"]["on_track"]) == (82.0, 78, 2.0, False)
    window = body["compare"]["windows"][0]
    selected = next(row for row in window["metrics"] if row["metric"] == "score")
    assert (selected["value"], selected["average"], window["rounds"]) == (78, 82, 1)
    assert body["course"]["rounds_played"] == 3

    benchmark_path = f"/api/stats/{alice['id']}/benchmark?against=handicap&handicap=15"
    benchmark = get(benchmark_path)
    assert benchmark.status_code == 200, benchmark.text
    assert benchmark.json()["benchmark"]["par4_to_par"] == 1.025
    assert get(f"/api/stats/{alice['id']}/benchmark?against=handicap&handicap=13").status_code == 422
    assert get(f"/api/stats/{alice['id']}/benchmark?against=friend").status_code == 422

    nine_course = api.client.post("/api/courses", headers=alice["headers"], json={
        "name": "Nine Links", "holes": [{"number": n, "par": 4} for n in range(1, 10)],
        "tees": [{"color": "Blue", "course_rating": 35.5, "slope_rating": 113,
                  "hole_yardages": {str(n): 300 for n in range(1, 10)}}],
    })
    assert nine_course.status_code == 201, nine_course.text
    nine_id = nine_course.json()["id"]
    saved_nine = api.client.post("/api/scan/save", headers=alice["headers"], json={
        "course_id": nine_id, "tee_box": "Blue", "date": "2026-09-02",
        "hole_scores": [{"hole_number": n, "strokes": 5 if n <= 6 else 4, "putts": 2} for n in range(1, 10)],
    })
    assert saved_nine.status_code == 200, saved_nine.text
    partial = api.client.post("/api/scan/save", headers=alice["headers"], json={
        "course_id": course, "date": "2026-09-03", "hole_scores": [{"hole_number": 1, "strokes": 3}],
    })
    assert partial.status_code == 200, partial.text
    assert api.client.patch(f"/api/users/{alice['id']}", headers=alice["headers"], json={"scoring_goal_nine": 44}).status_code == 200
    dashboard = get(paths["dashboard"]).json()
    assert (dashboard["scoring_average"], dashboard["scoring_average_nine"], dashboard["best_round_nine"]) == (82.0, 42.0, 42)
    analytics = get(paths["analytics"]).json()
    assert (analytics["kpis"]["scoring_average"], analytics["kpis"]["scoring_average_nine"]) == (82.0, 42.0)
    assert (analytics["kpis"]["average_putts"], analytics["kpis"]["average_putts_nine"]) == (36.0, 18.0)
    goal = get(paths["goal"]).json()
    assert goal["nine_hole"]["on_track"] is True
    assert {a["round_id"] for a in goal["attempts"]} == set(rounds)
    detail = get(f"/api/rounds/{saved_nine.json()['id']}").json()
    assert detail["nines"]["front"]["putts"] == 18 and detail["nines"]["back"]["putts"] is None
    rated_course = get(f"/api/courses/{nine_id}").json()
    assert rated_course["tees"][0]["course_handicap"] == detail["course_handicap"]

    compared = get(paths["compare"]).json()["windows"][0]
    assert compared["rounds"] == 1
    assert next(m for m in compared["metrics"] if m["metric"] == "score")["average"] == 82
    for day in range(1, 22):
        response = api.client.post("/api/scan/save", headers=alice["headers"], json={
            "course_id": nine_id, "date": f"2026-10-{day:02d}",
            "hole_scores": [{"hole_number": n, "strokes": 4} for n in range(1, 10)],
        })
        assert response.status_code == 200, response.text
    dashboard = get(paths["dashboard"]).json()
    assert dashboard["handicap_index"] == body["dashboard"]["handicap_index"]
    assert dashboard["scoring_average_l5"] == 82.0
    assert sum(row["used"] for row in dashboard["whs"]["rows"]) == dashboard["whs"]["count_used"] == 1

    edited = api.client.put(f"/api/rounds/{rounds[0]}", headers=alice["headers"],
                            json={"hole_scores": [{"hole_number": 1, "strokes": 5, "putts": 3}]})
    assert edited.status_code == 200, edited.text
    saver = next(row for row in get(paths["goal"]).json()["savers"] if row["type"] == "three_putt_bleed")
    assert (saver["headline"], saver["detail"], saver["strokes_saved"]) == ("Cut out 3-putts", "0.3 a round", 0.33)


def test_course_list_and_search_show_masters_and_only_your_own_courses(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    asyncio.run(_create_master_course(api.url))
    custom_course(api, alice, name="Alice Links")
    custom_course(api, bob, name="Bob Links")
    names = lambda response: [c["name"] for c in response.json()]
    get = lambda path, user=None: api.client.get(path, headers=user["headers"] if user else {})

    assert names(get("/api/courses", bob)) == ["Master Links"]
    assert names(get(f"/api/courses?user_id={bob['id']}", bob)) == ["Bob Links", "Master Links"]
    assert get(f"/api/courses?user_id={alice['id']}", bob).status_code == 403
    assert get(f"/api/courses?user_id={bob['id']}").status_code == 403

    assert names(get("/api/courses/search?q=links", bob)) == ["Bob Links", "Master Links"]
    assert names(get("/api/courses/search?q=links")) == ["Master Links"]
    assert get(f"/api/courses/search?q=links&user_id={alice['id']}", bob).status_code == 403
    assert get("/api/courses/search?q=nowhere&include_external=true").status_code == 401

    custom_course(api, bob, name="Bob_s Links")
    assert names(get("/api/courses/search?q=_", bob)) == ["Bob_s Links"]
    assert names(get("/api/courses/search?q=%25", bob)) == []


def test_course_clone_edit_and_create_rules(api):
    alice = api.user("alice@example.com")
    headers = alice["headers"]
    course = lambda course_id: api.client.get(f"/api/courses/{course_id}", headers=headers).json()
    edit = lambda course_id, body: api.client.put(f"/api/courses/{course_id}", headers=headers, json=body)
    (master,) = asyncio.run(_create_master_courses(api.url, [Course(
        name="Provider Links", external_course_id="ext-1", total_holes=18,
        holes=[Hole(number=n, par=p, handicap=n) for n, p in PARS.items()],
        tees=[Tee(color="Blue", hole_yardages={n: 400 for n in PARS})],
    )]))
    lookalike = custom_course(api, alice, name="Provider Links North")

    clone = api.client.post(f"/api/courses/{master}/clone", headers=headers).json()["id"]
    assert edit(clone, {"name": "My Links"}).status_code == 200
    again = api.client.post(f"/api/courses/{master}/clone", headers=headers)
    assert (again.status_code, again.json()["id"]) == (201, clone)

    other = custom_course(api, alice, name="Other Links")
    provider_taken = edit(other, {"external_course_id": "ext-1"})
    assert (provider_taken.status_code, provider_taken.json()["detail"]) == (409, COURSE_PROVIDER_ID_TAKEN)
    name_taken = edit(other, {"name": "my links"})
    assert (name_taken.status_code, name_taken.json()["detail"]) == (409, COURSE_NAME_TAKEN)

    par_from_holes = edit(lookalike, {"par": 70})
    assert (par_from_holes.status_code, par_from_holes.json()["detail"]) == (422, COURSE_PAR_FROM_HOLES)
    assert course(lookalike)["par"] == 72
    bare = api.client.post("/api/courses", headers=headers, json={"name": "Bare Links"}).json()["id"]
    assert edit(bare, {"par": 70}).status_code == 200
    assert course(bare)["par"] == 70

    nine = lambda yardages: api.client.post("/api/courses", headers=headers, json={
        "name": "Nine Links", "holes": [{"number": n, "par": 4} for n in range(1, 10)],
        "tees": [{"color": "White", "hole_yardages": yardages}],
    })
    assert nine({"9": 380, "15": 400}).status_code == 422
    created = nine({"9": 380})
    assert created.status_code == 201, created.text
    assert course(created.json()["id"])["tees"][0]["hole_yardages"] == {"9": 380}


def test_courses_page_lists_your_played_courses_first_and_pages_stably(api):
    alice = api.user("alice@example.com")
    headers = alice["headers"]
    full = lambda name: Course(
        name=name, total_holes=18,
        holes=[Hole(number=n, par=p, handicap=n) for n, p in PARS.items()],
        tees=[Tee(color="Blue", hole_yardages={n: 400 for n in PARS})],
    )
    ids = asyncio.run(_create_master_courses(
        api.url,
        [Course(name=f"Course {i:02d}", location="CA") for i in range(55)]
        + [Course(name="Twin Oaks", location=f"City {i}") for i in range(4)]
        + [full("Zinfandel Links"), full("Yarrow Links")],
    ))
    zinfandel, yarrow = ids[-2], ids[-1]
    save_round(api, alice, yarrow, date="2026-09-01")
    save_round(api, alice, zinfandel, date="2026-10-01")
    own = custom_course(api, alice, name="Alice Links")
    listed = lambda **params: api.client.get(
        "/api/courses", headers=headers, params={"user_id": alice["id"], **params}).json()

    first_page = [c["id"] for c in listed()]
    assert len(first_page) == 50
    assert first_page[:2] == [zinfandel, yarrow]
    assert first_page[2] == own
    assert first_page[3] == ids[0]

    every = [c["id"] for c in listed(limit=100)]
    assert len(set(every)) == len(every) == 62
    twin_oaks = every[56:62]
    assert {c["name"] for c in listed(limit=4, offset=58)} == {"Twin Oaks"}
    walked = [c["id"] for offset in range(56, 62, 2) for c in listed(limit=2, offset=offset)]
    assert walked == twin_oaks


def test_friends_list_shows_only_your_own_friendships(api):
    alice, bob, carol = (api.user(f"{n}@example.com") for n in ("alice", "bob", "carol"))
    code = api.client.get(f"/api/users/{bob['id']}", headers=bob["headers"]).json()["friend_code"]
    friendship = api.client.post("/api/users/me/friends", headers=alice["headers"],
                                 json={"addressee_friend_code": code}).json()["id"]
    friends = lambda user, query="": api.client.get(f"/api/users/me/friends{query}", headers=user["headers"])
    rows = lambda user, query="": [(f["id"], f["requester_id"], f["addressee_id"], f["status"])
                                   for f in friends(user, query).json()]

    pending = [(friendship, alice["id"], bob["id"], "pending")]
    assert rows(alice) == rows(bob) == pending
    assert rows(carol) == []
    assert rows(bob, "?status=accepted") == []
    assert api.client.patch(f"/api/users/me/friends/{friendship}", headers=bob["headers"],
                            json={"status": "accepted"}).status_code == 200
    assert rows(bob, "?status=accepted") == [(friendship, alice["id"], bob["id"], "accepted")]
    assert rows(carol, "?status=accepted") == []
    assert friends(bob, "?status=bogus").status_code == 422


async def _sql(url: str, query: str, *args) -> None:
    conn = await asyncpg.connect(url)
    try:
        await conn.execute(query, *args)
    finally:
        await conn.close()


def backdate_tokens(api: Api, email: str, column: str) -> None:
    asyncio.run(_sql(api.url, f"""UPDATE users.auth_tokens
                                    SET {column} = (now() AT TIME ZONE 'UTC') - interval '2 minutes'
                                    WHERE user_id = (SELECT id FROM users.users WHERE email = $1)""", email))


def test_resend_verification_and_the_emailed_link(api):
    sent = lambda: [kind for kind, _, _ in api.emails].count("verify")
    resend = lambda email: api.client.post("/api/auth/resend-verification", json={"email": email})
    api.register("cy@example.com")
    first = api.token_from("verify", "cy@example.com")

    assert (resend("cy@example.com").status_code, sent()) == (200, 1)
    backdate_tokens(api, "cy@example.com", "created_at")
    assert (resend("cy@example.com").status_code, sent()) == (200, 2)
    second = api.token_from("verify", "cy@example.com")
    assert second != first
    assert api.client.post("/api/auth/verify-email", json={"token": first}).status_code == 400

    opened = api.client.get("/api/auth/verify-email", params={"token": second})
    assert opened.status_code == 200, opened.text
    me = api.client.get("/api/auth/me")
    assert (me.status_code, me.json()["email"]) == (200, "cy@example.com")
    api.client.cookies.clear()

    backdate_tokens(api, "cy@example.com", "created_at")
    assert (resend("cy@example.com").status_code, sent()) == (200, 2)
    assert (resend("ghost@example.com").status_code, sent()) == (200, 2)

    api.register("dee@example.com")
    backdate_tokens(api, "dee@example.com", "expires_at")
    expired = api.client.get("/api/auth/verify-email", params={"token": api.token_from("verify", "dee@example.com")})
    assert expired.status_code == 400
    assert api.login("dee@example.com").status_code == 403


def png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (40, 20), "white").save(buffer, format="PNG")
    return buffer.getvalue()


class MemoryReportStore:
    def __init__(self):
        self.reports = []

    async def save(self, report) -> bool:
        self.reports.append(report)
        return True


def report_metadata(**overrides) -> str:
    return json.dumps({"schema_version": 1, "retry_key": str(uuid.uuid4()), "category": "unreadable_scores",
                       "stage": "parse", "http_status": 422} | overrides)


def test_failed_scan_reports_are_anonymous_and_validated(api):
    alice = api.user("alice@example.com")
    image = png_bytes()
    post = lambda name, data, metadata=None, extra=None: api.client.post(
        "/api/scan/reports", headers=alice["headers"], files={"file": (name, data, "image/png")},
        data={"metadata": metadata or report_metadata()} | (extra or {}))

    api.client.app.dependency_overrides[scan_reports.get_scan_report_store] = lambda: None
    unavailable = post("card.png", image)
    assert (unavailable.status_code, unavailable.json()["code"]) == (503, "report_storage_unavailable")

    store = MemoryReportStore()
    api.client.app.dependency_overrides[scan_reports.get_scan_report_store] = lambda: store
    assert post("card.png", image, extra={"user_id": alice["id"]}).status_code == 422
    assert post("card.png", image, metadata=report_metadata(note="free text")).status_code == 422
    assert post("card.gif", image).status_code == 400
    assert post("card.png", b"not an image at all").status_code == 400
    assert store.reports == []

    key = str(uuid.uuid4())
    saved = post("card.png", image, metadata=report_metadata(retry_key=key))
    assert (saved.status_code, saved.json()) == (200, {"status": "saved"})
    [report] = store.reports
    assert {f.name for f in dataclasses.fields(report)} == {
        "image", "media_type", "retry_key", "category", "stage", "http_status", "schema_version"}
    assert (report.image, report.media_type, str(report.retry_key), report.category) == (
        image, "image/png", key, "unreadable_scores")


def test_scan_uploads_are_rejected_before_ocr(api, scan_providers):
    alice = api.user("alice@example.com")
    extract = lambda name, data, content_type="image/jpeg": api.client.post(
        "/api/scan/extract", headers=alice["headers"], files={"file": (name, data, content_type)})
    card = (SCORECARD_DIR / "eaglevins_90.jpg").read_bytes()

    gif = extract("card.gif", card)
    assert (gif.status_code, gif.json()["failure"]["category"]) == (400, "invalid_upload")
    assert extract("card.jpg", card, content_type="text/html").status_code == 400
    fake = extract("card.jpg", b"<html>not a scorecard</html>")
    assert (fake.status_code, fake.json()["failure"]) == (400, {"category": "invalid_upload", "stage": "upload"})
    too_big = extract("card.jpg", b"\0" * (scan_uploads.MAX_UPLOAD_BYTES + 1))
    assert (too_big.status_code, too_big.json()["failure"]["category"]) == (413, "invalid_upload")
    ocr = api.client.post("/api/scan/ocr", headers=alice["headers"],
                          files={"file": ("card.jpg", b"<html>not a scorecard</html>", "image/jpeg")})
    assert ocr.status_code == 400
    assert scan_providers["ocr"] == []
    assert extract("card.jpg", card).status_code != 400


def test_login_locks_after_five_failed_attempts(api):
    api.user("alice@example.com")

    assert [api.login("alice@example.com", password="wrong password!").status_code for _ in range(5)] == [401] * 5
    locked = api.login("alice@example.com")
    assert locked.status_code == 429
    assert int(locked.headers["Retry-After"]) > 0


def test_signup_is_rate_limited_per_email(api, monkeypatch):
    monkeypatch.setenv("REGISTER_RATE_LIMIT_PER_EMAIL_ATTEMPTS", "2")
    attempt = lambda email: api.client.post(
        "/api/auth/register", json={"name": "Eve", "email": email, "password": PASSWORD}).status_code

    assert [attempt("eve@example.com") for _ in range(3)] == [201, 409, 429]
    assert attempt("other@example.com") == 201


def test_anonymous_scans_and_reports_are_rate_limited(api, scan_providers):
    alice = api.user("alice@example.com")
    api.client.app.dependency_overrides[scan_reports.get_scan_report_store] = lambda: None
    ocr = lambda headers=None: api.client.post(
        "/api/scan/ocr", headers=headers or {}, files=upload()).status_code

    assert [ocr() for _ in range(6)] == [200] * 6
    assert ocr() == 429
    assert ocr(alice["headers"]) == 200

    report = lambda: api.client.post(
        "/api/scan/reports", files={"file": ("card.png", png_bytes(), "image/png")},
        data={"metadata": report_metadata()}).status_code
    assert [report() for _ in range(10)] == [503] * 10
    assert report() == 429


def test_hole_scores_cannot_set_net_score(api):
    alice = api.user("alice@example.com")
    course = custom_course(api, alice)
    scores = [{"hole_number": n, "strokes": p} for n, p in PARS.items()]
    with_net = [scores[0] | {"net_score": 3}, *scores[1:]]

    save = api.client.post("/api/scan/save", headers=alice["headers"],
                           json={"course_id": course, "tee_box": "Blue", "hole_scores": with_net})
    assert save.status_code == 422, save.text
    assert api.client.get(f"/api/rounds/user/{alice['id']}", headers=alice["headers"]).json() == []

    round_id = save_round(api, alice, course)
    before = api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).json()
    edit = api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"],
                          json={"hole_scores": [{"hole_number": 1, "strokes": 3, "net_score": 2}]})
    assert edit.status_code == 422, edit.text
    assert api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).json() == before


def test_api_schema_has_unique_operation_ids_and_status_routes_still_answer(api):
    schema = api.client.get("/openapi.json")
    assert schema.status_code == 200
    ids = [op["operationId"] for item in schema.json()["paths"].values() for op in item.values()]
    assert len(ids) == len(set(ids))
    assert {"/", "/health", "/api/health"}.isdisjoint(schema.json()["paths"])

    for path in ("/", "/health", "/api/health"):
        assert api.client.get(path).status_code == 200, path
        head = api.client.head(path)
        assert (head.status_code, head.content) == (200, b""), path


def test_scan_rejects_a_fake_pdf_and_sends_a_real_one_to_ocr_unchanged(api, scan_providers):
    alice = api.user("alice@example.com")
    fake = api.client.post("/api/scan/extract", headers=alice["headers"],
                           files={"file": ("card.pdf", b"%PDF-but the rest is not a PDF", "application/pdf")})
    assert (fake.status_code, fake.json()["failure"]) == (400, {"category": "invalid_upload", "stage": "upload"})
    assert scan_providers["ocr"] == []

    real = pdf_card(pages=1)
    ocr = api.client.post("/api/scan/ocr", headers=alice["headers"], files={"file": ("card.pdf", real, "application/pdf")})
    assert ocr.status_code == 200, ocr.text
    assert scan_providers["ocr_bytes"] == [real]


def test_anonymous_ocr_works_without_a_database(api, scan_providers):
    alice = api.user("alice@example.com")
    database = api.client.app.state.db_manager
    api.client.app.state.db_manager = None
    try:
        ocr = api.client.post("/api/scan/ocr", files=upload())
        assert ocr.status_code == 200, ocr.text
        assert scan_providers["ocr"] == ["JPEG"]
        assert api.client.get(f"/api/rounds/user/{alice['id']}", headers=alice["headers"]).status_code == 503
    finally:
        api.client.app.state.db_manager = database


def test_scans_leave_no_temporary_files_behind(api, scan_providers, monkeypatch, tmp_path):
    alice = api.user("alice@example.com")
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    raw_photo = io.BytesIO()
    Image.new("RGB", (2400, 1800), "white").save(raw_photo, "PNG")
    post = lambda path, files, **data: api.client.post(
        path, headers=alice["headers"], files={"file": files}, data=data or None)

    assert post("/api/scan/ocr", ("card.png", raw_photo.getvalue(), "image/png")).status_code == 200
    assert post("/api/scan/extract", ("card.png", raw_photo.getvalue(), "image/png"),
                user_context=EAGLE_VINES["user_context"]).status_code == 200
    assert post("/api/scan/extract", ("card.jpg", b"not an image", "image/jpeg")).status_code == 400
    assert post("/api/scan/extract", ("card.jpg", b"\0" * (scan_uploads.MAX_UPLOAD_BYTES + 1), "image/jpeg")).status_code == 413
    assert scan_providers["ocr"] == ["JPEG", "JPEG"]
    assert list(tmp_path.iterdir()) == []
