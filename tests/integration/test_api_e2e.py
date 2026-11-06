"""End-to-end API tests: the real FastAPI app (middleware, auth, routing, serialization) on a real
PostgreSQL database. Only outgoing email and the paid OCR/LLM providers are replaced, so tests can
read the emailed tokens and scan a committed scorecard without network calls.

These replace the handler-level route tests that called endpoint functions with mocked
repositories: they prove auth and ownership through the same HTTP path the app uses.
"""

import asyncio
import copy
import dataclasses
import io
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import asyncpg
import pytest
import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from jose import jwk, jwt
from PIL import Image

import api.main as api_main
from api import apple_identity, auth_utils, error_responses, google_identity, messages
from api.routers import auth, scan, scan_reports
from database import DatabaseManager
from models import Course, Hole, Tee
from tests.integration.conftest import SCHEMA_PATH, _get_test_database_url
from tests.test_mistral_scorecard_parser import EAGLE_VINES_WITH_INITIALS

pytestmark = pytest.mark.integration

PASSWORD = "correct horse battery"
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


class Api:
    """A test client plus the emails the app tried to send."""

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
        """Register, verify and log in; returns the user id and bearer headers."""
        self.register(email)
        self.verify(email)
        body = self.login(email).json()
        self.client.cookies.clear()  # each user acts only through its own bearer token
        return {"id": body["user_id"], "headers": {"Authorization": f"Bearer {body['access_token']}"}}


@pytest.fixture
def api(monkeypatch):
    url = _get_test_database_url()
    asyncio.run(_reset_schema(url))
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("SECRET_KEY", "e2e-only-secret-key-not-used-anywhere-else-0123")
    monkeypatch.setenv("APP_ENV", "development")
    for limit in ("REGISTER_RATE_LIMIT_MAX_ATTEMPTS", "REGISTER_RATE_LIMIT_PER_EMAIL_ATTEMPTS",
                  "LOGIN_REQUEST_RATE_LIMIT_MAX_ATTEMPTS", "FORGOT_PASSWORD_RATE_LIMIT_MAX_ATTEMPTS",
                  "GOOGLE_LOGIN_RATE_LIMIT_MAX_ATTEMPTS", "APPLE_LOGIN_RATE_LIMIT_MAX_ATTEMPTS",
                  "APPLE_NONCE_RATE_LIMIT_MAX_ATTEMPTS"):
        monkeypatch.setenv(limit, "1000")
    # Auth limiters live at module level; give each test empty buckets so no test inherits
    # another's attempts (the middleware limiter is already fresh per create_app()).
    for limiter in (auth.login_rate_limiter, auth.register_rate_limiter, auth.auth_request_rate_limiter):
        empty = copy.copy(limiter._buckets)
        empty.clear()
        monkeypatch.setattr(limiter, "_buckets", empty)
    with TestClient(api_main.create_app(), base_url="http://localhost") as client:
        harness = Api(client, url)
        monkeypatch.setattr(auth, "send_verification_email", lambda to, link: harness.emails.append(("verify", to, link)))
        monkeypatch.setattr(auth, "send_password_reset_email", lambda to, link: harness.emails.append(("reset", to, link)))
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


# ================================================================
# Auth lifecycle
# ================================================================


def test_register_verify_login_me_logout(api):
    api.register("ada@example.com", name="Ada")

    assert api.login("ada@example.com").status_code == 403  # unverified accounts can't log in
    api.verify("ada@example.com")
    login = api.login("ada@example.com")
    assert login.status_code == 200
    cookie = login.headers["set-cookie"].lower()
    assert "httponly" in cookie

    me = api.client.get("/api/auth/me")  # authenticated by the cookie alone
    assert (me.status_code, me.json()["email"], me.json()["name"]) == (200, "ada@example.com", "Ada")

    assert api.client.post("/api/auth/logout").status_code == 200
    assert api.client.get("/api/auth/me").status_code == 401


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
    # A second request inside the 60-second cooldown answers the same but sends no new email.
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


# ================================================================
# Ownership: one user can never read or change another user's data
# ================================================================


def test_rounds_belong_to_their_owner(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    round_id = save_round(api, alice, custom_course(api, alice))

    assert api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).status_code == 200
    assert api.client.get(f"/api/rounds/{round_id}", headers=bob["headers"]).status_code == 403
    edit = {"hole_scores": [{"hole_number": 1, "strokes": 3}]}
    assert api.client.put(f"/api/rounds/{round_id}", headers=bob["headers"], json=edit).status_code == 403
    assert api.client.delete(f"/api/rounds/{round_id}", headers=bob["headers"]).status_code == 403
    assert api.client.get(f"/api/rounds/user/{alice['id']}", headers=bob["headers"]).status_code == 403
    assert api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).status_code == 200  # untouched


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
    # Bob's own URL can't reach Alice's tee either: the lookup is owner-scoped.
    assert api.client.delete(f"/api/users/{bob['id']}/tees/{tee['id']}", headers=bob["headers"]).status_code == 404
    for path in (f"/api/stats/dashboard/{alice['id']}", f"/api/stats/milestones/{alice['id']}",
                 f"/api/users/{alice['id']}/handicap", f"/api/stats/analytics/{alice['id']}"):
        assert api.client.get(path, headers=bob["headers"]).status_code == 403, path


def test_friends_can_view_analytics_only_after_accepting(api):
    alice, bob, carol = api.user("alice@example.com"), api.user("bob@example.com"), api.user("carol@example.com")
    save_round(api, alice, custom_course(api, alice))
    code = api.client.get(f"/api/users/{bob['id']}", headers=bob["headers"]).json()["friend_code"]
    request = api.client.post("/api/users/me/friends", headers=alice["headers"], json={"addressee_friend_code": code})
    friendship = request.json()["id"]

    assert api.client.get(f"/api/stats/analytics/{alice['id']}", headers=bob["headers"]).status_code == 403
    # Only the addressee can accept.
    assert api.client.patch(f"/api/users/me/friends/{friendship}", headers=carol["headers"],
                            json={"status": "accepted"}).status_code in (403, 404)
    assert api.client.patch(f"/api/users/me/friends/{friendship}", headers=bob["headers"],
                            json={"status": "accepted"}).status_code == 200
    analytics = api.client.get(f"/api/stats/analytics/{alice['id']}", headers=bob["headers"])
    assert analytics.status_code == 200 and analytics.json()["kpis"]["total_rounds"] == 1
    assert api.client.get(f"/api/stats/dashboard/{alice['id']}", headers=bob["headers"]).status_code == 403


# ================================================================
# Round lifecycle through the API
# ================================================================


def test_saved_round_is_listed_edited_and_deleted(api):
    alice = api.user("alice@example.com")
    round_id = save_round(api, alice, custom_course(api, alice), over=10)  # 72 + 10

    listed = api.client.get(f"/api/rounds/user/{alice['id']}", headers=alice["headers"]).json()
    assert [(r["id"], r["total_score"], r["to_par"]) for r in listed] == [(round_id, 82, 10)]

    edit = {"hole_scores": [{"hole_number": 1, "strokes": 3, "putts": 1}]}  # was 5 on a par 4
    edited = api.client.put(f"/api/rounds/{round_id}", headers=alice["headers"], json=edit)
    assert edited.status_code == 200
    detail = api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).json()
    assert sum(hole["strokes"] for hole in detail["hole_scores"]) == 80

    dashboard = api.client.get(f"/api/stats/dashboard/{alice['id']}", headers=alice["headers"]).json()
    assert (dashboard["scoring_average"], dashboard["best_round"]) == (80.0, 80)

    assert api.client.delete(f"/api/rounds/{round_id}", headers=alice["headers"]).status_code == 204
    assert api.client.get(f"/api/rounds/user/{alice['id']}", headers=alice["headers"]).json() == []


# ================================================================
# Scan pipeline: upload → OCR → extract → review → save
# ================================================================

SCORECARD_DIR = Path(__file__).resolve().parents[1] / "test_scorecards"
EAGLE_VINES = next(
    case for case in json.loads((SCORECARD_DIR / "quick_eval_cases.json").read_text())["cases"]
    if case["id"] == "eagle_vines_tucker"
)
EAGLE_VINES_STROKES = {int(hole): strokes for hole, strokes in EAGLE_VINES["expected"]["strokes"].items()}


@pytest.fixture
def scan_providers(monkeypatch):
    """Replace the only paid calls in the scan path: Mistral OCR and the Gemini table merge.

    OCR answers with the committed markdown for ``eaglevins_90.jpg``. Upload validation, image
    normalization, markdown extraction, parsing, assembly and saving all run for real.
    """
    calls = {"ocr": [], "merge": []}

    async def fake_ocr(self, file_path, **kwargs):
        with Image.open(file_path) as image:  # the file the real provider would have received
            calls["ocr"].append(image.format)
        return {"pages": [{"markdown": EAGLE_VINES_WITH_INITIALS}]}

    async def fake_merge(markdown):
        calls["merge"].append(markdown)
        return markdown

    monkeypatch.setattr(scan.MistralOCRService, "ocr_file", fake_ocr)
    monkeypatch.setattr(scan, "merge_split_tables", fake_merge)
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
    assert len(scan_providers["ocr"]) == 1  # the prefetched text was reused, not re-OCR'd
    extracted = extract.json()["round"]
    assert {h["hole_number"]: h["strokes"] for h in extracted["hole_scores"]} == EAGLE_VINES_STROKES

    # Review: nothing is written until the round has a course.
    unreviewed = {"tee_box": "White", "date": "2026-10-02", "hole_scores": extracted["hole_scores"]}
    no_course = api.client.post("/api/scan/save", headers=alice["headers"], json=unreviewed)
    assert no_course.status_code == 422, no_course.text
    assert api.client.get(f"/api/rounds/user/{alice['id']}", headers=alice["headers"]).json() == []

    # The reviewer names the course and fills the tee's yardages; the scan supplies the pars.
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
    assert api.client.get(f"/api/courses/{course_id}", headers=bob["headers"]).status_code == 403  # Alice's own

    # A second scan under the same name reuses Alice's course instead of creating another.
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
    # The same requests from the owner go through (control), and OCR never ran for either user.
    assert api.client.post("/api/scan/save", headers=alice["headers"],
                           json={"course_id": private, "tee_box": "Blue", "hole_scores": scores}).status_code == 200
    assert scan_providers["ocr"] == []


# ================================================================
# Expired and forged access tokens
# ================================================================


def mint_token(user_id: str, *, expires_in: timedelta, secret: str | None = None) -> str:
    """An access token with the app's own claims; only the expiry and the key vary."""
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
    bearer = lambda token: {"Authorization": f"Bearer {token}"}  # noqa: E731

    valid = mint_token(alice["id"], expires_in=timedelta(hours=1))
    assert api.client.get("/api/auth/me", headers=bearer(valid)).status_code == 200  # the mint is right

    expired = mint_token(alice["id"], expires_in=timedelta(hours=-1))
    assert api.client.get("/api/auth/me", headers=bearer(expired)).status_code == 401
    assert api.client.get(f"/api/rounds/user/{alice['id']}", headers=bearer(expired)).status_code == 401
    api.client.cookies.set(auth_utils.get_access_token_cookie_name(), expired)
    assert api.client.get("/api/auth/me").status_code == 401
    api.client.cookies.clear()

    forged = mint_token(alice["id"], expires_in=timedelta(hours=1), secret="some-other-secret-key-0123456789abcdef")
    assert api.client.get("/api/auth/me", headers=bearer(forged)).status_code == 401


# ================================================================
# Ownership on round comparison, goal report and course analytics
# ================================================================


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

    # Bob's own URLs with Alice's ids only ever search Bob's history.
    assert api.client.get(f"/api/stats/compare/{bob['id']}/{round_id}", headers=bob["headers"]).status_code == 404
    seen = api.client.get(f"/api/stats/course-analytics/{bob['id']}/{course}", headers=bob["headers"])
    assert seen.status_code == 200
    assert (seen.json()["rounds_played"], seen.json()["score_trend_on_course"]) == (0, [])
    assert api.client.get(f"/api/stats/{bob['id']}/goal-report", headers=bob["headers"]).json()["gap"] is None


# ================================================================
# Linking rounds to courses and cloning master courses
# ================================================================


def test_round_relinks_to_master_and_cloned_courses_with_ownership(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    master = asyncio.run(_create_master_course(api.url))
    round_id = save_round(api, alice, custom_course(api, alice))
    link = lambda user, course: api.client.post(  # noqa: E731
        f"/api/rounds/{round_id}/link-course", headers=user["headers"], json={"course_id": course})

    assert link(bob, master).status_code == 403
    assert link(alice, custom_course(api, bob, name="Bob's Links")).status_code == 403
    assert link(alice, str(uuid.uuid4())).status_code == 404

    relinked = link(alice, master)
    assert relinked.status_code == 200, relinked.text
    assert relinked.json()["course_id"] == master
    detail = api.client.get(f"/api/rounds/{round_id}", headers=alice["headers"]).json()
    assert detail["course"]["name"] == "Master Links"
    assert sum(h["strokes"] for h in detail["hole_scores"]) == 82  # scores survive the relink

    clone = api.client.post(f"/api/courses/{master}/clone", headers=alice["headers"])
    assert clone.status_code == 201, clone.text
    clone_id = clone.json()["id"]
    assert (clone.json()["total_holes"], clone.json()["tee_count"], clone.json()["par"]) == (18, 1, 72)
    assert api.client.get(f"/api/courses/{clone_id}", headers=alice["headers"]).status_code == 200
    assert api.client.get(f"/api/courses/{clone_id}", headers=bob["headers"]).status_code == 403
    again = api.client.post(f"/api/courses/{master}/clone", headers=alice["headers"])
    assert (again.status_code, again.json()["id"]) == (201, clone_id)  # cloning again returns the same copy
    assert api.client.post(f"/api/courses/{clone_id}/clone", headers=bob["headers"]).status_code == 403

    assert link(alice, clone_id).status_code == 200
    rounds_on = lambda course: api.client.get(  # noqa: E731
        f"/api/stats/course-analytics/{alice['id']}/{course}", headers=alice["headers"]).json()["rounds_played"]
    assert (rounds_on(clone_id), rounds_on(master)) == (1, 0)


# ================================================================
# User tee update and delete
# ================================================================


def test_user_tee_update_and_delete(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    tees = f"/api/users/{alice['id']}/tees"
    yardages = lambda y: {str(n): y for n in range(1, 19)}  # noqa: E731
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


# ================================================================
# Stats endpoints on seeded rounds
# ================================================================


def test_stats_endpoints_answer_from_seeded_rounds(api):
    alice = api.user("alice@example.com")
    course = custom_course(api, alice)
    rounds = [save_round(api, alice, course, over=over, date=day)  # 82, 78, 86 on a par 72
              for over, day in ((10, "2026-09-01"), (6, "2026-09-08"), (14, "2026-09-15"))]
    assert api.client.patch(f"/api/users/{alice['id']}", headers=alice["headers"],
                            json={"scoring_goal": 80}).status_code == 200
    get = lambda path: api.client.get(path, headers=alice["headers"])  # noqa: E731
    paths = {
        "dashboard": f"/api/stats/dashboard/{alice['id']}",
        "analytics": f"/api/stats/analytics/{alice['id']}",
        "played": f"/api/stats/{alice['id']}/played-courses",
        "milestones": f"/api/stats/milestones/{alice['id']}",
        "goal": f"/api/stats/{alice['id']}/goal-report",
        "compare": f"/api/stats/compare/{alice['id']}/{rounds[1]}",
        "course": f"/api/stats/course-analytics/{alice['id']}/{course}",
        "handicap": f"/api/users/{alice['id']}/handicap",
    }
    responses = {name: get(path) for name, path in paths.items()}
    assert {name: r.status_code for name, r in responses.items()} == {name: 200 for name in paths}
    body = {name: r.json() for name, r in responses.items()}

    assert (body["dashboard"]["scoring_average"], body["dashboard"]["best_round"]) == (82.0, 78)
    assert body["analytics"]["kpis"]["total_rounds"] == 3
    assert [c["id"] for c in body["played"]] == [course]
    assert (body["goal"]["scoring_average"], body["goal"]["best_score"], body["goal"]["gap"],
            body["goal"]["on_track"]) == (82.0, 78, 2.0, False)
    selected = next(row for row in body["compare"]["score"] if row["label"] == "Selected Round")
    assert (selected["round_id"], selected["primary_value"], selected["secondary_value"]) == (rounds[1], 78, 6)
    assert body["course"]["rounds_played"] == 3
    assert isinstance(body["milestones"]["milestones"], list)


# ================================================================
# Lookups that must reveal only the caller's own data
# ================================================================


def test_user_lookup_by_email_reveals_only_your_own_account(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    lookup = lambda email: api.client.get(f"/api/users/by-email/{email}", headers=bob["headers"])  # noqa: E731

    own = lookup("bob@example.com")
    assert (own.status_code, own.json()["id"]) == (200, bob["id"])
    assert lookup("BOB@Example.COM").status_code == 200
    # Another user's account and a missing account answer the same, so emails can't be probed.
    assert lookup("alice@example.com").status_code == 403
    assert lookup("ghost@example.com").status_code == 403
    assert lookup("not-an-email").status_code == 422
    assert alice["id"] not in lookup("alice@example.com").text


def test_course_list_and_search_show_masters_and_only_your_own_courses(api):
    alice, bob = api.user("alice@example.com"), api.user("bob@example.com")
    asyncio.run(_create_master_course(api.url))
    custom_course(api, alice, name="Alice Links")
    custom_course(api, bob, name="Bob Links")
    names = lambda response: [c["name"] for c in response.json()]  # noqa: E731
    get = lambda path, user=None: api.client.get(path, headers=user["headers"] if user else {})  # noqa: E731

    assert names(get("/api/courses", bob)) == ["Master Links"]
    assert names(get(f"/api/courses?user_id={bob['id']}", bob)) == ["Bob Links", "Master Links"]
    assert get(f"/api/courses?user_id={alice['id']}", bob).status_code == 403
    assert get(f"/api/courses?user_id={bob['id']}").status_code == 403

    assert names(get("/api/courses/search?q=links", bob)) == ["Bob Links", "Master Links"]  # own first
    assert names(get("/api/courses/search?q=links")) == ["Master Links"]
    assert get(f"/api/courses/search?q=links&user_id={alice['id']}", bob).status_code == 403
    assert get("/api/courses/search?q=nowhere&include_external=true").status_code == 401


def test_friends_list_shows_only_your_own_friendships(api):
    alice, bob, carol = (api.user(f"{n}@example.com") for n in ("alice", "bob", "carol"))
    code = api.client.get(f"/api/users/{bob['id']}", headers=bob["headers"]).json()["friend_code"]
    friendship = api.client.post("/api/users/me/friends", headers=alice["headers"],
                                 json={"addressee_friend_code": code}).json()["id"]
    friends = lambda user, query="": api.client.get(f"/api/users/me/friends{query}", headers=user["headers"])  # noqa: E731
    rows = lambda user, query="": [(f["id"], f["requester_id"], f["addressee_id"], f["status"])  # noqa: E731
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


# ================================================================
# Email verification: resend and the emailed link
# ================================================================


async def _sql(url: str, query: str, *args) -> None:
    conn = await asyncpg.connect(url)
    try:
        await conn.execute(query, *args)
    finally:
        await conn.close()


def backdate_tokens(api: Api, email: str, column: str) -> None:
    """Set ``created_at`` or ``expires_at`` of a user's tokens to two minutes ago (stored as naive UTC)."""
    asyncio.run(_sql(api.url, f"""UPDATE users.auth_tokens
                                    SET {column} = (now() AT TIME ZONE 'UTC') - interval '2 minutes'
                                    WHERE user_id = (SELECT id FROM users.users WHERE email = $1)""", email))


def test_resend_verification_and_the_emailed_link(api):
    sent = lambda: [kind for kind, _, _ in api.emails].count("verify")  # noqa: E731
    resend = lambda email: api.client.post("/api/auth/resend-verification", json={"email": email})  # noqa: E731
    api.register("cy@example.com")
    first = api.token_from("verify", "cy@example.com")

    assert (resend("cy@example.com").status_code, sent()) == (200, 1)  # inside the 60-second cooldown
    backdate_tokens(api, "cy@example.com", "created_at")
    assert (resend("cy@example.com").status_code, sent()) == (200, 2)
    second = api.token_from("verify", "cy@example.com")
    assert second != first
    assert api.client.post("/api/auth/verify-email", json={"token": first}).status_code == 400  # replaced

    opened = api.client.get("/api/auth/verify-email", params={"token": second})
    assert opened.status_code == 200, opened.text
    me = api.client.get("/api/auth/me")  # the link signs the user in by cookie
    assert (me.status_code, me.json()["email"]) == (200, "cy@example.com")
    api.client.cookies.clear()

    backdate_tokens(api, "cy@example.com", "created_at")
    assert (resend("cy@example.com").status_code, sent()) == (200, 2)  # already verified
    assert (resend("ghost@example.com").status_code, sent()) == (200, 2)  # unknown looks the same

    api.register("dee@example.com")
    backdate_tokens(api, "dee@example.com", "expires_at")
    expired = api.client.get("/api/auth/verify-email", params={"token": api.token_from("verify", "dee@example.com")})
    assert expired.status_code == 400
    assert api.login("dee@example.com").status_code == 403  # still unverified


# ================================================================
# Failed-scan reports
# ================================================================


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
    post = lambda name, data, metadata=None, extra=None: api.client.post(  # noqa: E731
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
    # Signed in or not, the stored report carries no user, filename or other identity.
    assert {f.name for f in dataclasses.fields(report)} == {
        "image", "media_type", "retry_key", "category", "stage", "http_status", "schema_version"}
    assert (report.image, report.media_type, str(report.retry_key), report.category) == (
        image, "image/png", key, "unreadable_scores")


# ================================================================
# Scan uploads rejected before OCR
# ================================================================


def test_scan_uploads_are_rejected_before_ocr(api, scan_providers):
    alice = api.user("alice@example.com")
    extract = lambda name, data, content_type="image/jpeg": api.client.post(  # noqa: E731
        "/api/scan/extract", headers=alice["headers"], files={"file": (name, data, content_type)})
    card = (SCORECARD_DIR / "eaglevins_90.jpg").read_bytes()

    gif = extract("card.gif", card)
    assert (gif.status_code, gif.json()["failure"]["category"]) == (400, "invalid_upload")
    assert extract("card.jpg", card, content_type="text/html").status_code == 400
    fake = extract("card.jpg", b"<html>not a scorecard</html>")
    assert (fake.status_code, fake.json()["failure"]) == (400, {"category": "invalid_upload", "stage": "upload"})
    too_big = extract("card.jpg", b"\0" * (scan.MAX_UPLOAD_BYTES + 1))
    assert (too_big.status_code, too_big.json()["failure"]["category"]) == (413, "invalid_upload")
    ocr = api.client.post("/api/scan/ocr", headers=alice["headers"],
                          files={"file": ("card.jpg", b"<html>not a scorecard</html>", "image/jpeg")})
    assert ocr.status_code == 400
    assert scan_providers["ocr"] == []
    assert extract("card.jpg", card).status_code != 400  # the real card passes validation (control)


# ================================================================
# Rate limits
# ================================================================


def test_login_locks_after_five_failed_attempts(api):
    api.user("alice@example.com")

    assert [api.login("alice@example.com", password="wrong password!").status_code for _ in range(5)] == [401] * 5
    locked = api.login("alice@example.com")  # the right password no longer helps
    assert locked.status_code == 429
    assert int(locked.headers["Retry-After"]) > 0


def test_signup_is_rate_limited_per_email(api, monkeypatch):
    monkeypatch.setenv("REGISTER_RATE_LIMIT_PER_EMAIL_ATTEMPTS", "2")
    attempt = lambda email: api.client.post(  # noqa: E731
        "/api/auth/register", json={"name": "Eve", "email": email, "password": PASSWORD}).status_code

    assert [attempt("eve@example.com") for _ in range(3)] == [201, 409, 429]
    assert attempt("other@example.com") == 201  # the limit is per email


def test_anonymous_scans_and_reports_are_rate_limited(api, scan_providers):
    alice = api.user("alice@example.com")
    api.client.app.dependency_overrides[scan_reports.get_scan_report_store] = lambda: None
    ocr = lambda headers=None: api.client.post(  # noqa: E731
        "/api/scan/ocr", headers=headers or {}, files=upload()).status_code

    assert [ocr() for _ in range(6)] == [200] * 6
    assert ocr() == 429
    assert ocr(alice["headers"]) == 200  # signed-in scans have their own allowance

    report = lambda: api.client.post(  # noqa: E731
        "/api/scan/reports", files={"file": ("card.png", png_bytes(), "image/png")},
        data={"metadata": report_metadata()}).status_code
    assert [report() for _ in range(10)] == [503] * 10
    assert report() == 429


# ================================================================
# Request contract
# ================================================================


def test_hole_scores_cannot_set_net_score(api):
    alice = api.user("alice@example.com")
    course = custom_course(api, alice)
    scores = [{"hole_number": n, "strokes": p} for n, p in PARS.items()]
    with_net = [scores[0] | {"net_score": 3}] + scores[1:]

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
    # A route serving GET and HEAD gets one ID for both, chosen differently per process; the
    # frontend compares its committed schema copy byte for byte, so IDs must be unique and stable.
    assert len(ids) == len(set(ids))
    assert {"/", "/health", "/api/health"}.isdisjoint(schema.json()["paths"])

    for path in ("/", "/health", "/api/health"):  # Railway health checks use these
        assert api.client.get(path).status_code == 200, path
        head = api.client.head(path)
        assert (head.status_code, head.content) == (200, b""), path


# ================================================================
# Google and Apple sign-in. Tokens are signed with test RSA keys; only the providers'
# key download (JWKS over HTTP) is replaced, so signature and claim checks run for real.
# ================================================================

GOOGLE_CLIENT = "web-client.apps.googleusercontent.com"
APPLE_CLIENTS = ("com.example.web.service", "com.example.golf.app")


@dataclasses.dataclass
class _SigningKey:
    kid: str
    private_pem: str
    public_jwk: dict


def _signing_key(kid: str) -> _SigningKey:
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = private.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    ).decode()
    public_pem = private.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()
    return _SigningKey(kid, pem, {**jwk.construct(public_pem, "RS256").to_dict(), "kid": kid, "use": "sig"})


class IdentityProviders:
    """Fake Google and Apple key servers, plus helpers that sign provider-shaped tokens."""

    def __init__(self, api: Api):
        self.api = api
        self.keys = {"google": [_signing_key("google-1")], "apple": [_signing_key("apple-1")]}
        self.down = False

    def handle(self, request: httpx.Request) -> httpx.Response:
        if self.down:
            raise httpx.ConnectError("provider unreachable", request=request)
        provider = "google" if request.url.host == "www.googleapis.com" else "apple"
        return httpx.Response(200, json={"keys": [key.public_jwk for key in self.keys[provider]]})

    def rotate(self, provider: str) -> None:
        self.keys[provider].append(_signing_key(f"{provider}-{len(self.keys[provider]) + 1}"))

    def token(self, provider: str, claims: dict, *, key: _SigningKey | None = None, kid: str | None = None) -> str:
        key = key or self.keys[provider][-1]
        return jwt.encode(claims, key.private_pem, algorithm="RS256", headers={"kid": kid or key.kid})

    @staticmethod
    def claims(provider: str, **overrides) -> dict:
        now = int(datetime.now(timezone.utc).timestamp())
        base = {"sub": f"{provider}-sub-1", "iat": now, "exp": now + 600, "email_verified": True}
        if provider == "google":
            base |= {"iss": "https://accounts.google.com", "aud": GOOGLE_CLIENT, "email": "golfer@gmail.com",
                     "name": "Google Golfer"}
        else:
            base |= {"iss": "https://appleid.apple.com", "aud": APPLE_CLIENTS[1], "email": "golfer@icloud.com"}
        return {k: v for k, v in (base | overrides).items() if v is not None}

    def nonce(self) -> str:
        response = self.api.client.post("/api/auth/apple/nonce")
        assert response.status_code == 200, response.text
        return response.json()["nonce"]

    def google(self, token: str):
        return self.api.client.post("/api/auth/google", json={"credential": token})

    def apple(self, token: str, nonce: str, name: str | None = None):
        return self.api.client.post("/api/auth/apple", json={"identity_token": token, "nonce": nonce, "name": name})

    def sign_in(self, provider: str, **overrides):
        """Sign in with a valid token for ``provider`` (claims overridable)."""
        if provider == "google":
            return self.google(self.token("google", self.claims("google", **overrides)))
        nonce = self.nonce()
        return self.apple(self.token("apple", self.claims("apple", nonce=nonce, **overrides)), nonce)


@pytest.fixture
def providers(api, monkeypatch):
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_ID", GOOGLE_CLIENT)
    monkeypatch.setenv("APPLE_CLIENT_IDS", ",".join(APPLE_CLIENTS))
    fake = IdentityProviders(api)
    for keys in (google_identity.GOOGLE_KEYS, apple_identity.APPLE_KEYS):
        monkeypatch.setattr(keys, "transport", httpx.MockTransport(fake.handle))
        keys.clear()
    yield fake
    google_identity.GOOGLE_KEYS.clear()
    apple_identity.APPLE_KEYS.clear()


def _user_id_for(api: Api, email: str) -> str:
    async def fetch():
        conn = await asyncpg.connect(api.url)
        try:
            return [str(row["id"]) for row in await conn.fetch("SELECT id FROM users.users WHERE email = $1", email)]
        finally:
            await conn.close()

    ids = asyncio.run(fetch())
    assert len(ids) == 1, ids
    return ids[0]


def test_google_sign_in_creates_an_account_then_signs_back_in(api, providers):
    first = providers.sign_in("google")
    assert first.status_code == 200, first.text
    body = first.json()
    assert (body["email"], body["name"], body["email_verified"]) == ("golfer@gmail.com", "Google Golfer", True)

    assert api.client.get("/api/auth/me").json()["user_id"] == body["user_id"]  # session cookie
    api.client.cookies.clear()
    me = api.client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["user_id"] == body["user_id"]

    again = providers.sign_in("google")
    assert again.json()["user_id"] == body["user_id"]
    assert _user_id_for(api, "golfer@gmail.com") == body["user_id"]
    assert api.login("golfer@gmail.com").status_code == 401  # the account has no password


def test_provider_sign_in_links_to_a_verified_password_account(api, providers):
    owner = api.user("golfer@gmail.com")

    response = providers.sign_in("google")

    assert response.status_code == 200, response.text
    assert response.json()["user_id"] == owner["id"]
    assert api.login("golfer@gmail.com").status_code == 200  # the owner's password still works


@pytest.mark.parametrize("provider", ["google", "apple"])
def test_provider_sign_in_claims_an_unverified_account_and_drops_its_password(api, providers, provider):
    email = "golfer@gmail.com" if provider == "google" else "golfer@icloud.com"
    api.register(email)  # someone who does not own the address registers it first
    squatter_link = api.token_from("verify", email)

    response = providers.sign_in(provider)

    assert response.status_code == 200, response.text
    assert response.json()["user_id"] == _user_id_for(api, email)
    assert api.login(email).status_code == 401  # the squatter's password is gone
    api.client.cookies.clear()
    assert api.client.post("/api/auth/verify-email", json={"token": squatter_link}).status_code == 400
    me = api.client.get("/api/auth/me", headers={"Authorization": f"Bearer {response.json()['access_token']}"})
    assert me.json()["email_verified"] is True


def test_google_email_without_authority_cannot_link_to_an_existing_account(api, providers):
    owner = api.user("pro@club.example")

    refused = providers.sign_in("google", email="pro@club.example")
    assert refused.status_code == 409
    assert refused.json()["detail"] == messages.PROVIDER_EMAIL_NEEDS_PASSWORD_SIGN_IN

    # A Workspace account (hd claim) is authoritative for its domain, so it may link.
    linked = providers.sign_in("google", email="pro@club.example", hd="club.example")
    assert linked.json()["user_id"] == owner["id"]


def test_provider_tokens_are_rejected_unless_signature_issuer_audience_and_expiry_match(api, providers):
    stranger = _signing_key("stranger")
    hour_ago = int(datetime.now(timezone.utc).timestamp()) - 3600
    for provider, detail in (("google", messages.INVALID_GOOGLE_TOKEN), ("apple", messages.INVALID_APPLE_TOKEN)):
        known_kid = providers.keys[provider][0].kid
        cases = {
            "wrong audience": providers.token(provider, providers.claims(provider, aud="someone-else")),
            "wrong issuer": providers.token(provider, providers.claims(provider, iss="https://evil.example")),
            "expired": providers.token(provider, providers.claims(provider, iat=hour_ago - 600, exp=hour_ago)),
            "missing subject": providers.token(provider, providers.claims(provider, sub=None)),
            "forged signature": providers.token(provider, providers.claims(provider), key=stranger, kid=known_kid),
            "HS256": jwt.encode(providers.claims(provider), "shared-secret", algorithm="HS256",
                                     headers={"kid": known_kid}),
        }
        for case, token in cases.items():
            if provider == "google":
                response = providers.google(token)
            else:
                nonce = providers.nonce()
                response = providers.apple(token, nonce)
            assert (response.status_code, response.json()["detail"]) == (401, detail), (provider, case)


def test_apple_sign_in_needs_a_fresh_single_use_nonce(api, providers):
    nonce = providers.nonce()
    token = providers.token("apple", providers.claims("apple", nonce=nonce, aud=APPLE_CLIENTS[1]))
    first = providers.apple(token, nonce, name="Apple Golfer")
    assert first.status_code == 200, first.text  # any configured audience is accepted
    assert first.json()["name"] == "Apple Golfer"
    assert providers.apple(token, nonce).status_code == 401  # replay

    no_nonce = api.client.post("/api/auth/apple", json={"identity_token": token})
    assert no_nonce.status_code == 422

    signed_for, offered = providers.nonce(), providers.nonce()
    mismatched = providers.token("apple", providers.claims("apple", nonce=signed_for))
    assert providers.apple(mismatched, offered).status_code == 401
    # The failed attempt burned neither nonce.
    assert providers.apple(mismatched, signed_for).status_code == 200
    reuse_offered = providers.token("apple", providers.claims("apple", nonce=offered))
    assert providers.apple(reuse_offered, offered).status_code == 200

    expired = providers.nonce()
    asyncio.run(_sql(api.url, "UPDATE users.auth_nonces SET expires_at = (now() AT TIME ZONE 'UTC') - interval '1 minute'"))
    assert providers.apple(providers.token("apple", providers.claims("apple", nonce=expired)), expired).status_code == 401

    never_issued = "n" * 43
    forged = providers.token("apple", providers.claims("apple", nonce=never_issued))
    assert providers.apple(forged, never_issued).status_code == 401


def test_apple_first_sign_in_needs_a_verified_email(api, providers):
    missing = providers.sign_in("apple", email=None)
    assert (missing.status_code, missing.json()["detail"]) == (400, messages.APPLE_EMAIL_MISSING)

    unverified = providers.sign_in("apple", email_verified="false")
    assert (unverified.status_code, unverified.json()["detail"]) == (403, messages.APPLE_EMAIL_NOT_VERIFIED)


def test_provider_key_rotation_and_outage(api, providers, monkeypatch):
    assert providers.sign_in("google").status_code == 200  # caches google-1
    monkeypatch.setattr(google_identity.GOOGLE_KEYS, "MIN_REFRESH_SECONDS", 0)
    providers.rotate("google")
    rotated = providers.sign_in("google")  # signed with google-2, unknown to the cache
    assert rotated.status_code == 200, rotated.text

    providers.down = True
    for keys in (google_identity.GOOGLE_KEYS, apple_identity.APPLE_KEYS):
        keys.clear()
    for provider in ("google", "apple"):
        response = providers.sign_in(provider)
        assert response.status_code == 503, provider
        assert response.json()["detail"] == error_responses.SERVICE_UNAVAILABLE
