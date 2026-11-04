"""End-to-end API tests: the real FastAPI app (middleware, auth, routing, serialization) on a real
PostgreSQL database. Only outgoing email and the paid OCR/LLM providers are replaced, so tests can
read the emailed tokens and scan a committed scorecard without network calls.

These replace the handler-level route tests that called endpoint functions with mocked
repositories: they prove auth and ownership through the same HTTP path the app uses.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import asyncpg
import pytest
from fastapi.testclient import TestClient
from jose import jwt
from PIL import Image

import api.main as api_main
from api import auth_utils
from api.routers import auth, scan
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
                  "LOGIN_REQUEST_RATE_LIMIT_MAX_ATTEMPTS", "FORGOT_PASSWORD_RATE_LIMIT_MAX_ATTEMPTS"):
        monkeypatch.setenv(limit, "1000")
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
