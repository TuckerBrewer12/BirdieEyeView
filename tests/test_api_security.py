import pytest

import api.security as security
from tests.helpers import make_http_request


def test_deployment_security_accepts_allowlisted_ssl_database(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "s" * 32)
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@db.internal:5432/app?sslmode=require")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("DB_HOST_ALLOWLIST", "db.internal")

    security.validate_deployment_security()


def test_allowed_hosts_include_configured_deployment_hosts(monkeypatch):
    monkeypatch.setenv("ALLOWED_HOSTS", "api.example.com,api.example.com")
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com/path")
    monkeypatch.setenv("RAILWAY_STATIC_URL", "railway.example.com:443/path")
    monkeypatch.setenv("RAILWAY_PROJECT_ID", "project")

    hosts = security.parse_allowed_hosts()

    assert hosts.count("api.example.com") == 1
    assert {"app.example.com", "railway.example.com", "healthcheck.railway.app"} <= set(hosts)
    assert "*.railway.app" not in hosts


def test_forwarded_https_request_is_recognized(monkeypatch):
    monkeypatch.setenv("ENFORCE_HTTPS", "true")
    request = make_http_request(headers=[(b"x-forwarded-proto", b"https, http")])

    assert security.is_https_request(request) is True
    assert security.enforce_https_if_needed(request) is None


def test_health_check_is_exempt_from_https_redirect(monkeypatch):
    monkeypatch.setenv("ENFORCE_HTTPS", "true")
    monkeypatch.setenv("ALLOW_LOCAL_HTTP", "false")

    assert security.enforce_https_if_needed(make_http_request("/api/health")) is None


def test_http_api_request_redirects_to_https(monkeypatch):
    monkeypatch.setenv("ENFORCE_HTTPS", "true")
    monkeypatch.setenv("ALLOW_LOCAL_HTTP", "false")

    redirect = security.enforce_https_if_needed(make_http_request("/api/users"))

    assert redirect.status_code == 307
    assert str(redirect.headers["location"]).startswith("https://")


def test_local_http_can_be_explicitly_allowed(monkeypatch):
    monkeypatch.setenv("ENFORCE_HTTPS", "true")
    monkeypatch.setenv("ALLOW_LOCAL_HTTP", "true")
    request = make_http_request("/api/users")

    assert security.should_allow_insecure_local_request(request) is True
    assert security.enforce_https_if_needed(request) is None


def make_monitor(monkeypatch, *, times, request_threshold=20, auth_threshold=5):
    clock = iter(times)
    monkeypatch.setattr(security.time, "time", lambda: next(clock))
    monitor = security.SecurityTrafficMonitor(
        request_window_sec=10,
        auth_window_sec=30,
        request_threshold=request_threshold,
        auth_failure_threshold=auth_threshold,
        alert_cooldown_sec=10,
    )
    monitor._request_threshold = request_threshold
    monitor._auth_failure_threshold = auth_threshold
    return monitor


def test_traffic_monitor_logs_api_error(monkeypatch, caplog):
    monitor = make_monitor(monkeypatch, times=[100.0])

    monitor.record(ip="1", status_code=500, method="GET", path="/api/x", latency_ms=1, user_agent="ua")

    assert "API error response" in caplog.text


def test_traffic_monitor_alerts_on_unusual_volume(monkeypatch, caplog):
    monitor = make_monitor(monkeypatch, times=[100.0, 101.0], request_threshold=2)

    monitor.record(ip="1", status_code=200, method="GET", path="/api/x", latency_ms=1, user_agent="ua")
    monitor.record(ip="1", status_code=200, method="GET", path="/api/x", latency_ms=1, user_agent="ua")

    assert "Unusual traffic volume" in caplog.text


def test_traffic_monitor_alerts_on_auth_failures(monkeypatch, caplog):
    monitor = make_monitor(monkeypatch, times=[100.0, 101.0], auth_threshold=2)

    monitor.record(
        ip="1",
        status_code=401,
        method="POST",
        path="/api/auth/login",
        latency_ms=1,
        user_agent="ua",
    )
    monitor.record(
        ip="1",
        status_code=403,
        method="POST",
        path="/api/auth/login",
        latency_ms=1,
        user_agent="ua",
    )

    assert "Potential brute-force" in caplog.text
