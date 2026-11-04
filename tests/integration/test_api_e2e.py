"""End-to-end API tests: the real FastAPI app (middleware, auth, routing, serialization) on a real
PostgreSQL database. Only outgoing email is replaced, so tests can read the emailed tokens.

These replace the handler-level route tests that called endpoint functions with mocked
repositories: they prove auth and ownership through the same HTTP path the app uses.
"""

import asyncio
from urllib.parse import parse_qs, urlparse

import asyncpg
import pytest
from fastapi.testclient import TestClient

import api.main as api_main
from api.routers import auth
from database import DatabaseManager
from models import Course, Hole, Tee
from tests.integration.conftest import SCHEMA_PATH, _get_test_database_url

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


def save_round(api: Api, owner: dict, course_id: str, over: int = 10) -> str:
    scores = [{"hole_number": n, "strokes": p + (1 if n <= over else 0), "putts": 2} for n, p in PARS.items()]
    response = api.client.post(
        "/api/scan/save",
        headers=owner["headers"],
        json={"course_id": course_id, "tee_box": "Blue", "date": "2026-10-01", "hole_scores": scores},
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
