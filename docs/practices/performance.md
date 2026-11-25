# Measuring a speed change

A speed PR shows before/after numbers against its base: the PR below it in a stack, otherwise `main`. The harness in `scripts/perf/` produces them; this guide is how to run it and the traps it already avoids.

## Setup

1. A disposable Postgres with `database/schema.sql`, then `DATABASE_URL=... python scripts/perf/seed_user.py`. It loads the Scheffler rounds four times, each copy a year further back (224 rounds), and gives `scheffler@example.com` the password `bench-password-123`.
2. The API on port 8000 against that database (`uvicorn api.main:app --port 8000`). To compare two backends, run the base checkout's API on another port and pass both ports to `serve_pair.sh`.
3. Build both frontends (`npm run build` in each checkout) and copy each `dist/` somewhere stable.
4. `scripts/perf/serve_pair.sh BASE_DIST PR_DIST [BASE_API_PORT] [PR_API_PORT]` serves base on `https://localhost:8443` and the PR on `:8444` with this checkout's `server.js`, behind a local TLS proxy.
5. From `frontend/`: `node ../scripts/perf/pages.mjs`. It prints markdown tables for a slow phone and 4G: landing page signed out (first and repeat visit) and a signed-in cold dashboard followed by a switch to Analytics. Set `CHROMIUM` if Playwright's own browser isn't installed.

Nine runs per side (`RUNS=9`, the default), alternating order, with medians and ranges. One run is noise: two identical builds can differ by more than 100 ms. Keep other work off the machine while it runs.

## What the harness gets right

- **Exact milestones.** Times come from a `requestAnimationFrame` probe in the page (hero, hero photo, dashboard handicap, Analytics round count), never from Playwright's `waitFor`, which polls every 500 ms once a wait runs long and buckets the numbers.
- **A working HTTP cache.** Chrome trusts the local certificate through `--ignore-certificate-errors-spki-list`; with a certificate error it caches nothing, and repeat visits look like first visits. `page.route` also turns the cache off, so Google Fonts are blocked by `--host-resolver-rules` instead.
- **Brotli.** Chrome only asks for brotli over HTTPS, which is why the builds sit behind `tls_proxy.mjs`.
- **Real data shapes.** Filters are checked against the seeded data: the Scheffler rounds are all older than a year, so a `1y` timeframe matches nothing. Use a course filter to exercise a filtered read.

## Backend changes

A backend change that saves database round trips only shows with the database some distance away. To measure one:

1. Put `scripts/perf/pg_latency.py 6432 5432 ONE_WAY_MS` in front of Postgres. A round trip then costs about twice `ONE_WAY_MS`.
2. Run the base checkout's API on port 8100 and the PR's on 8200, both with `DATABASE_URL` on port 6432.
3. `DB_PORT=6432 PGDATABASE=<db> python scripts/perf/http_times.py "stats/dashboard/{user}" "rounds/{round}"` prints one table row per path: the measured `SELECT 1` round trip, then base and PR medians over 21 alternating requests.

Repeat for a few delays (0, 1, 5 and 10 ms one way cover the same network through another region). Restart both APIs after changing the delay. Identical code on both sides can still differ by about 10% at a handful of requests; keep `N` at 21.

Profile before porting an old plan: `cProfile` around `dashboard_response` or `analytics_response` on the seeded rounds shows the current hot path, which moves as the code does. Report the response JSON as byte-identical before and after when the change shouldn't alter output.
